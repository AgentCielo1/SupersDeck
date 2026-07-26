import { NextResponse } from "next/server";
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
//  events so Stripe stops retrying; only signature failures (400) and
//  unexpected processing errors (500) are non-200.
// =============================================================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SupabaseLike = NonNullable<ReturnType<typeof getServerSupabase>>;

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

  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  // 2. Idempotency: claim this event.id (PRIMARY KEY). A duplicate delivery
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

  // 3. Apply the event.
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

    // 4. Backfill the resolved org on the event row for traceability.
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
