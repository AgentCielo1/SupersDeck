import { NextResponse } from "next/server";
import { getStripe, isStripeConfigured, buildingPriceId } from "@/lib/stripe";
import { getServerSupabase } from "@/lib/supabase";
import { getCurrentUserProfile, getCurrentOrg } from "@/lib/supabase-server";
import { db } from "@/lib/db";

// =============================================================================
//  POST /api/billing/create-checkout — start a Stripe Checkout (admin only)
// =============================================================================
//  Creates (or reuses) the org's Stripe customer, then opens a subscription
//  Checkout session for $49/building/month with Stripe Tax enabled. Quantity
//  tracks the org's current building count (min 1). Returns { url } for the
//  client to redirect to.
// =============================================================================

export async function POST(request: Request) {
  // 1. Caller must be an authenticated admin.
  const me = await getCurrentUserProfile();
  if (!me) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (me.role !== "admin") {
    return NextResponse.json(
      { error: "Only admins can manage billing" },
      { status: 403 }
    );
  }

  // 2. Resolve the caller's org.
  const org = await getCurrentOrg();
  if (!org) {
    return NextResponse.json({ error: "No organization found" }, { status: 400 });
  }

  // 3. Stripe must be configured.
  const stripe = getStripe();
  if (!stripe || !isStripeConfigured()) {
    return NextResponse.json(
      { error: "Billing not configured" },
      { status: 503 }
    );
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  // 4. Ensure a Stripe customer exists for this org.
  let customerId = org.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: org.name,
      metadata: { org_id: org.id },
    });
    customerId = customer.id;
    const { error: updateError } = await supabase
      .from("orgs")
      .update({ stripe_customer_id: customerId })
      .eq("id", org.id);
    if (updateError) {
      return NextResponse.json(
        { error: "Could not save customer" },
        { status: 500 }
      );
    }
  }

  // 5. Quantity = number of buildings in the org, minimum 1.
  const buildings = await db.buildings();
  const quantity = Math.max(1, buildings.length);

  // 6. Create the Checkout session.
  const origin = new URL(request.url).origin;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: buildingPriceId(), quantity }],
    automatic_tax: { enabled: true },
    customer_update: { address: "auto" },
    subscription_data: { metadata: { org_id: org.id } },
    success_url: `${origin}/billing?success=1`,
    cancel_url: `${origin}/billing?canceled=1`,
    client_reference_id: org.id,
  });

  return NextResponse.json({ url: session.url });
}
