import Stripe from "stripe";

// =============================================================================
//  Server-side Stripe client + pricing constants
// =============================================================================
//  $49 / building / month. NY SaaS is taxable, so every subscription enables
//  Stripe Tax (automatic_tax). The free tier (1 building, no card) is enforced
//  in app logic + middleware, not Stripe.
//
//  Requires env vars:
//    STRIPE_SECRET_KEY
//    STRIPE_WEBHOOK_SECRET
//    STRIPE_PRICE_ID_BUILDING_MONTHLY
//    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY   (browser; non-sensitive)
// =============================================================================

let _stripe: Stripe | null = null;

/** Lazily build the Stripe client. Returns null if not configured so callers
 *  can degrade gracefully (the app still runs without billing wired up). */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!_stripe) {
    // apiVersion omitted on purpose — the SDK pins its own; avoids a literal
    // type mismatch on upgrade and uses the account's default.
    _stripe = new Stripe(key, { typescript: true });
  }
  return _stripe;
}

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_PRICE_ID_BUILDING_MONTHLY
  );
}

export const BUILDING_PRICE_USD = 49;
export const FREE_BUILDING_LIMIT = 1;

export function buildingPriceId(): string {
  return process.env.STRIPE_PRICE_ID_BUILDING_MONTHLY ?? "";
}

/** Maps a Stripe subscription.status to our orgs.subscription_status enum. */
export function mapStripeStatus(
  status: Stripe.Subscription.Status
): "free" | "active" | "past_due" | "cancelled" {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "cancelled";
    default:
      // incomplete / paused / etc — treat as not-yet-active.
      return "free";
  }
}
