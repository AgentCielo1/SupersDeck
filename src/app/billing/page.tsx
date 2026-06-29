import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import BillingActions from "./BillingActions";
import { db } from "@/lib/db";
import { getCurrentUserProfile, getCurrentOrg } from "@/lib/supabase-server";
import { BUILDING_PRICE_USD, FREE_BUILDING_LIMIT } from "@/lib/stripe";

// =============================================================================
//  /billing — subscription overview + actions (admin only)
// =============================================================================
//  $49 / building / month. Free tier = up to 1 building, no card. Shows the
//  current plan, usage, next billing date, and the Stripe Checkout / Portal
//  actions. Non-admins see an "Admins only" notice.
// =============================================================================

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatUSD(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { success?: string; canceled?: string };
}) {
  const me = await getCurrentUserProfile();

  if (!me || me.role !== "admin") {
    return (
      <>
        <PageHeader title="Billing" subtitle="Manage your subscription." />
        <div className="rounded-xl2 border border-ink-200 bg-white p-6 text-sm text-ink-400">
          Admins only. Ask an administrator to manage billing for your
          organization.
        </div>
      </>
    );
  }

  const [org, buildings] = await Promise.all([getCurrentOrg(), db.buildings()]);
  const buildingCount = buildings.length;

  const status = org?.subscription_status ?? "free";
  const isActive = status === "active";
  const isPastDue = status === "past_due";
  const isFreePlan = !isActive && buildingCount <= FREE_BUILDING_LIMIT;

  const planName = isFreePlan ? "Free" : "Property Plan";
  const monthlyAmount = isActive ? BUILDING_PRICE_USD * buildingCount : 0;
  const usageLimit = isFreePlan ? FREE_BUILDING_LIMIT : buildingCount;

  const showSuccess = searchParams?.success === "1";
  const showCanceled = searchParams?.canceled === "1";

  return (
    <>
      <PageHeader
        title="Billing"
        subtitle="Manage your subscription and payment method."
      />

      {isPastDue && (
        <div className="mb-6 rounded-xl2 border border-danger-600/40 bg-danger-600/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-danger-800">
                Payment failed — update your payment method
              </p>
              <p className="mt-0.5 text-sm text-danger-600">
                Your last payment didn&apos;t go through. Update your card to
                keep your subscription active.
              </p>
            </div>
            <a
              href="/api/billing/portal"
              className="rounded-md bg-danger-600 px-3 py-2 text-sm font-medium text-white hover:bg-danger-800"
            >
              Update payment method
            </a>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="mb-6 rounded-xl2 border border-ok-600/30 bg-ok-600/5 p-3 text-sm text-ok-800">
          Subscription updated. Thanks — your billing is all set.
        </div>
      )}
      {showCanceled && (
        <div className="mb-6 rounded-xl2 border border-ink-200 bg-white p-3 text-sm text-ink-400">
          Checkout canceled. No changes were made.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Current plan"
          value={planName}
          hint={isFreePlan ? "No card required" : "$49 / building / mo"}
          tone={isActive ? "brand" : "default"}
        />
        <StatCard
          label="Buildings"
          value={`${buildingCount} of ${usageLimit}`}
          hint={isFreePlan ? "Free tier limit" : "Billed buildings"}
        />
        <StatCard
          label="Monthly total"
          value={isActive ? formatUSD(monthlyAmount) : "$0"}
          hint={isActive ? `${buildingCount} × $${BUILDING_PRICE_USD}` : "—"}
        />
        <StatCard
          label="Next billing date"
          value={isActive ? formatDate(org?.current_period_end ?? null) : "—"}
          tone={isPastDue ? "danger" : "default"}
        />
      </div>

      <section className="mt-8 rounded-xl2 border border-ink-200 bg-white p-4">
        <h2 className="text-base font-semibold text-ink-900">
          {isActive ? "Manage your plan" : "Upgrade to the Property Plan"}
        </h2>
        <p className="mt-1 text-sm text-ink-400">
          {isActive
            ? "Add buildings or update your payment method anytime."
            : `You're on the free tier (up to ${FREE_BUILDING_LIMIT} building). Upgrade to bill ${buildingCount} ${
                buildingCount === 1 ? "building" : "buildings"
              } at $${BUILDING_PRICE_USD} each per month. Sales tax is calculated automatically at checkout.`}
        </p>
        <div className="mt-4">
          <BillingActions
            isActive={isActive}
            hasCustomer={Boolean(org?.stripe_customer_id)}
          />
        </div>
      </section>
    </>
  );
}
