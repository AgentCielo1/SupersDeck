export const metadata = { title: "Privacy Policy · SupersDeck" };

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-ink-900">Privacy Policy</h1>
      <p className="mt-1 text-sm text-ink-400">Last updated: June 29, 2026</p>

      <p className="mt-6 text-sm text-ink-600">
        This Privacy Policy explains what information SupersDeck collects, how we
        use it, how long we keep it, and the safeguards we apply.
      </p>

      <section className="mt-8">
        <h2 className="text-base font-semibold text-ink-900">Data we collect</h2>
        <p className="mt-2 text-sm text-ink-600">
          We collect building operational data, work orders, staff profiles, GPS
          timestamps, push notification subscriptions, and payment information.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-semibold text-ink-900">How we use it</h2>
        <p className="mt-2 text-sm text-ink-600">
          We use this information for building operations management and staff
          coordination.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-semibold text-ink-900">Data retention</h2>
        <p className="mt-2 text-sm text-ink-600">
          Operational data is retained while your subscription is active and for
          one year after cancellation. Payment records are retained in accordance
          with Stripe&apos;s policy.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-semibold text-ink-900">Third parties</h2>
        <p className="mt-2 text-sm text-ink-600">
          We share data with the following service providers as needed to operate
          SupersDeck:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-600">
          <li>Supabase (database)</li>
          <li>Stripe (payments)</li>
          <li>Twilio (SMS)</li>
          <li>Vercel (hosting)</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-semibold text-ink-900">
          Security &amp; the NY SHIELD Act
        </h2>
        <p className="mt-2 text-sm text-ink-600">
          In accordance with the NY SHIELD Act, data is encrypted at rest
          (AES-256) and in transit (TLS).
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-semibold text-ink-900">
          Breach notification
        </h2>
        <p className="mt-2 text-sm text-ink-600">
          We will notify affected customers within 72 hours of a confirmed
          breach.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-semibold text-ink-900">Contact</h2>
        <p className="mt-2 text-sm text-ink-600">
          For privacy questions, contact us at{" "}
          <a
            href="mailto:privacy@borodesk.com"
            className="text-brand-600 hover:text-brand-800 hover:underline"
          >
            privacy@borodesk.com
          </a>
          .
        </p>
      </section>

      <p className="mt-8 rounded-xl2 border border-ink-200 bg-white p-4 text-xs text-ink-400">
        Note: SupersDeck&apos;s emergency and operational notifications are
        supplementary to a building&apos;s required FDNY-mandated posted
        emergency notices and do not replace them.
      </p>

      <p className="mt-6 text-xs text-ink-400">
        SupersDeck is operated by BoroDesk.
      </p>
    </div>
  );
}
