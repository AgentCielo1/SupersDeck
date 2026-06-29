import { NextResponse } from "next/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { getCurrentUserProfile, getCurrentOrg } from "@/lib/supabase-server";

// =============================================================================
//  GET /api/billing/portal — open the Stripe Customer Portal (admin only)
// =============================================================================
//  Redirects (303) the admin into Stripe's hosted billing portal so they can
//  update payment methods, view invoices, or cancel. Requires an existing
//  Stripe customer on the org.
// =============================================================================

export async function GET(request: Request) {
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

  const origin = new URL(request.url).origin;

  // 2. Resolve the caller's org + Stripe customer.
  const org = await getCurrentOrg();
  if (!org || !org.stripe_customer_id) {
    // Nothing to manage yet — send them back to the billing page.
    return NextResponse.redirect(`${origin}/billing`, 303);
  }

  // 3. Stripe must be configured.
  const stripe = getStripe();
  if (!stripe || !isStripeConfigured()) {
    return NextResponse.json(
      { error: "Billing not configured" },
      { status: 503 }
    );
  }

  // 4. Create the portal session + redirect.
  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripe_customer_id,
    return_url: `${origin}/billing`,
  });

  return NextResponse.redirect(session.url, 303);
}
