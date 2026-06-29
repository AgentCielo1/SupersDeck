export const metadata = { title: "Terms of Service · SupersDeck" };

export default function TermsOfServicePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-ink-900">Terms of Service</h1>
      <p className="mt-1 text-sm text-ink-400">Last updated: June 29, 2026</p>

      <p className="mt-6 text-sm text-ink-600">
        These Terms of Service govern your use of SupersDeck. By using the
        service, you agree to the terms below.
      </p>

      <section className="mt-8">
        <h2 className="text-base font-semibold text-ink-900">The service</h2>
        <p className="mt-2 text-sm text-ink-600">
          SupersDeck is a building operations management SaaS.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-semibold text-ink-900">
          Limitation of liability
        </h2>
        <p className="mt-2 text-sm text-ink-600">
          Our total liability is capped at the amount of fees you paid in the 12
          months preceding the claim.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-semibold text-ink-900">No warranty</h2>
        <p className="mt-2 text-sm text-ink-600">
          The service is provided &ldquo;as-is,&rdquo; without warranties of any
          kind.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-semibold text-ink-900">Data processing</h2>
        <p className="mt-2 text-sm text-ink-600">
          The customer is the data controller; SupersDeck is the data processor.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-semibold text-ink-900">Governing law</h2>
        <p className="mt-2 text-sm text-ink-600">
          These terms are governed by the laws of the State of New York.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-semibold text-ink-900">
          Dispute resolution
        </h2>
        <p className="mt-2 text-sm text-ink-600">
          Disputes will be resolved through binding arbitration administered by
          the American Arbitration Association (AAA). Claims may be brought only
          on an individual basis.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-semibold text-ink-900">Cancellation</h2>
        <p className="mt-2 text-sm text-ink-600">
          You may cancel anytime. No refund is provided for the current billing
          period.
        </p>
      </section>

      <p className="mt-8 rounded-xl2 border border-ink-200 bg-white p-4 text-xs text-ink-400">
        Note: SupersDeck&apos;s emergency and operational notifications are
        supplementary to a building&apos;s required FDNY-mandated posted
        emergency notices and do not replace them.
      </p>
    </div>
  );
}
