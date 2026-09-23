import { NextResponse } from "next/server";
import { z } from "zod";
import type Stripe from "stripe";
import { getStripe, mapStripeStatus } from "@/lib/stripe";
import { getServerSupabase } from "@/lib/supabase";

// =============================================================================
//  POST /api/billing/webhook — Stripe webhook receiver
// =============================================================================
//  Verifies the Stripe signature, then idempotently applies subscription state
//  changes to the orgs table.
//
//  IDEMPOTENCY: every Stripe event.id is inserted into billing_events as the
//  PRIMARY KEY *before* any state change. A duplicate delivery hits the unique
//  constraint (Postgres 23505) and short-circuits with 200 — so retried/replayed
//  events never double-apply.
//
//  Always returns 200 for verified-and-handled (or verified-and-ignored)
//  events so Stripe stops retrying; only signature failures (400), payload
//  shape failures (400) and unexpected processing errors (500) are non-200.
//
//  SIGNATURE vs SCHEMA — both, in that order, and never the other way round.
//  constructEvent() is the authenticity control: it HMACs the raw bytes, so a
//  body that survives it provably came from Stripe. Nothing is parsed before
//  it sees the raw text. But authenticity is not shape: Stripe versions its
//  API, and the fields this handler reads off event.data.object decide whether
//  an org is marked active, past_due or cancelled. If `status` ever went
//  missing, mapStripeStatus() would fall through its default and silently
//  downgrade a paying customer to "free". So a verified event is additionally
//  checked against the narrow shape we actually read — a contract with Stripe,
//  asserted rather than assumed.
//
//  The shape check runs BEFORE the billing_events claim on purpose. Claiming
//  first would burn the event id, and the retry would then short-circuit as a
//  duplicate — a shape break would be swallowed exactly once and lost. Failing
//  before the claim leaves the event unacknowledged and visible in Stripe's own
//  dashboard, which is where a billing break belongs.
// =============================================================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SupabaseLike = NonNullable<ReturnType<typeof getServerSupabase>>;

// ---------------------------------------------------------------------------
//  Payload contracts — ONLY the fields this handler reads.
// ---------------------------------------------------------------------------
//  Deliberately loose objects: Stripe's payloads carry dozens of fields we do
//  not touch, and the verified object is passed on unchanged. This asserts the
//  shape, it does not trim it.
const CustomerRef = z.union([z.string(), z.looseObject({ id: z.string() })]).nullish();

const SubscriptionPayload = z.looseObject({
  id: z.string(),
  status: z.string(),
  customer: CustomerRef,
  metadata: z.record(z.string(), z.string()).nullish(),
  items: z
    .looseObject({
      data: z.array(z.looseObject({ current_period_end: z.number().nullish() })).optional(),
    })
    .nullish(),
});

const InvoicePayload = z.looseObject({ customer: CustomerRef });

/** The shape contract for the event types we act on. Types we only record
 *  (the `default` branch below) read no fields, so they have none. */
const PAYLOAD_CONTRACTS: Record<string, z.ZodType> = {
  "customer.subscription.created": SubscriptionPayload,
  "customer.subscription.updated": SubscriptionPayload,
  "customer.subscription.deleted": SubscriptionPayload,
  "invoice.payment_failed": InvoicePayload,
};

/** In Stripe API 2025-x / SDK v22, current_period_end moved off the
 *  Subscription object onto each subscription item. All items in a subscription
 *  share the same period, so we read it from the first item. */
function subscriptionPeriodEndISO(sub: Stripe.Subscription): string | null {
  const item = sub.items?.data?.[0] as
    | (Stripe.SubscriptionItem & { current_period_end?: number })
    | undefined;
  const epoch = item?.current_period_end;
  if (typeof epoch !== "number") return null;
  return new Date(epoch * 1000).toISOString();
}

/** Resolve the org id for a subscription: prefer the metadata we set at
 *  checkout, fall back to a lookup by stripe_customer_id. */
async function resolveOrgIdForSubscription(
  supabase: SupabaseLike,
  sub: Stripe.Subscription
): Promise<string | null> {
  const metaOrgId = sub.metadata?.org_id;
  if (metaOrgId) return metaOrgId;

  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!customerId) return null;

  const { data } = await supabase
    .from("orgs")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

/** Resolve the org id for an invoice via its customer. */
async function resolveOrgIdForCustomer(
  supabase: SupabaseLike,
  customerId: string | null
): Promise<string | null> {
  if (!customerId) return null;
  const { data } = await supabase
    .from("orgs")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

export async function POST(request: Request) {
  const sig = request.headers.get("stripe-signature");
  const raw = await request.text();

  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret || !sig) {
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 400 }
    );
  }

  // 1. Verify the signature.
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid signature";
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  // 2. Shape: a verified event still has to match the fields we read off it.
  //    Before the claim, so a shape break is retried and stays visible.
  const contract = PAYLOAD_CONTRACTS[event.type];
  if (contract) {
    const shape = contract.safeParse(event.data.object);
    if (!shape.success) {
      const details = shape.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      console.error("[billing/webhook] payload shape", event.type, event.id, details);
      return NextResponse.json(
        { error: `Unexpected ${event.type} payload shape: ${details}` },
        { status: 400 }
      );
    }
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  // 3. Idempotency: claim this event.id (PRIMARY KEY). A duplicate delivery
  //    fails the unique constraint and we short-circuit without re-applying.
  const { error: claimError } = await supabase
    .from("billing_events")
    .insert({ id: event.id, type: event.type })
    .select();

  if (claimError) {
    const isDuplicate =
      claimError.code === "23505" ||
      /duplicate key|already exists/i.test(claimError.message ?? "");
    if (isDuplicate) {
      return NextResponse.json({ received: true, duplicate: true });
    }
    return NextResponse.json(
      { error: "Could not record event" },
      { status: 500 }
    );
  }

  // 4. Apply the event.
  try {
    let orgId: string | null = null;

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        orgId = await resolveOrgIdForSubscription(supabase, sub);
        if (orgId) {
          await supabase
            .from("orgs")
            .update({
              subscription_status: mapStripeStatus(sub.status),
              stripe_subscription_id: sub.id,
              current_period_end: subscriptionPeriodEndISO(sub),
            })
            .eq("id", orgId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        orgId = await resolveOrgIdForSubscription(supabase, sub);
        if (orgId) {
          await supabase
            .from("orgs")
            .update({ subscription_status: "cancelled" })
            .eq("id", orgId);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id ?? null;
        orgId = await resolveOrgIdForCustomer(supabase, customerId);
        if (orgId) {
          await supabase
            .from("orgs")
            .update({ subscription_status: "past_due" })
            .eq("id", orgId);
        }
        break;
      }

      default:
        // Unknown / unhandled event — already recorded, just acknowledge.
        break;
    }

    // 5. Backfill the resolved org on the event row for traceability.
    if (orgId) {
      await supabase
        .from("billing_events")
        .update({ org_id: orgId })
        .eq("id", event.id);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unexpected error";
    console.error("[billing/webhook]", event.type, message);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
