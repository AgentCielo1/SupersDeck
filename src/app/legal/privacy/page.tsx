export const metadata = {
  title: "Privacy Policy — SupersDeck",
};

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 text-sm text-gray-700 leading-relaxed">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
      <p className="text-xs text-gray-400 mb-8">Effective date: June 2026</p>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-2">1. Who we are</h2>
        <p>
          SupersDeck is a property-operations platform built for New York City residential
          building superintendents and property managers. References to &ldquo;we,&rdquo;
          &ldquo;us,&rdquo; or &ldquo;SupersDeck&rdquo; in this policy mean the operator
          of this platform. For questions, contact{" "}
          <a href="mailto:support@borodesk.com" className="text-blue-700 underline">
            support@borodesk.com
          </a>
          .
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-2">2. Data we collect</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Account information</strong> — name, email address, role (super, admin,
            manager), and building assignment.
          </li>
          <li>
            <strong>GPS coordinates</strong> — collected only when you use location-gated
            features (e.g., PunchGrid clock-in). Coordinates are stored at the session
            level and tied to your building assignment.
          </li>
          <li>
            <strong>Work orders</strong> — description, priority, status, photos attached
            to the ticket, and timestamps for each status change.
          </li>
          <li>
            <strong>Resident communications</strong> — tenant intake requests submitted via
            public-facing work-order forms, including unit number, contact information
            provided by the resident, and issue description.
          </li>
          <li>
            <strong>Compliance and certification records</strong> — HPD violation data
            retrieved from NYC Open Data, building inspection dates, and contractor
            certificate-of-insurance expiry dates you upload.
          </li>
          <li>
            <strong>Voice call records</strong> — if the AI voice-receptionist feature is
            enabled, we store the audio recording and a machine-generated transcript for
            up to 90 days.
          </li>
          <li>
            <strong>Usage logs</strong> — page visits, API calls, and error events used
            solely for performance monitoring and debugging.
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-2">3. How we use data</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>To operate the platform and provide the features you access.</li>
          <li>
            To send operational alerts — HPD violation digests, COI-expiry warnings,
            monthly owner reports — to users with the appropriate role.
          </li>
          <li>
            To generate AI-assisted summaries and suggestions using Anthropic&rsquo;s
            Claude API (see Section 6).
          </li>
          <li>To monitor platform health and debug errors via Sentry.</li>
          <li>We do not sell your data or use it for advertising.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-2">4. Data retention</h2>
        <p>
          Work orders, compliance records, and account data are retained for as long as
          your organization&rsquo;s account is active. Voice call recordings and
          transcripts are automatically deleted after <strong>90 days</strong>. You may
          request earlier deletion (see Section 7).
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-2">5. Supabase — data processor</h2>
        <p>
          All platform data is stored in Supabase, Inc. (San Francisco, CA), which acts
          as our data processor. Supabase stores data in AWS us-east-1 by default. See{" "}
          <a
            href="https://supabase.com/privacy"
            className="text-blue-700 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            supabase.com/privacy
          </a>{" "}
          for their sub-processor list and DPA.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-2">6. Anthropic — AI processor</h2>
        <p>
          When AI-assisted features are used (work-order summaries, voice transcription,
          compliance suggestions), relevant data is sent to Anthropic, PBC (San
          Francisco, CA) via the Claude API. Anthropic does not use API inputs to train
          models by default. See{" "}
          <a
            href="https://www.anthropic.com/privacy"
            className="text-blue-700 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            anthropic.com/privacy
          </a>
          .
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-2">
          7. NY SHIELD Act compliance
        </h2>
        <p>
          SupersDeck implements reasonable administrative, technical, and physical
          safeguards consistent with the New York Stop Hacks and Improve Electronic Data
          Security (SHIELD) Act, including:
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Row-level security on all database tables enforced by Supabase RLS.</li>
          <li>All data transmitted over TLS 1.2+.</li>
          <li>Service-role keys stored only as encrypted server-side environment variables.</li>
          <li>
            In the event of a breach affecting New York residents, we will notify affected
            individuals and the New York Attorney General as required by law.
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-2">8. Resident rights</h2>
        <p>
          Residents whose data was submitted through a SupersDeck intake form may request:
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>
            <strong>Access</strong> — a copy of the personal information we hold about
            you.
          </li>
          <li>
            <strong>Deletion</strong> — removal of your personal information, subject to
            legitimate operational retention needs (e.g., active work orders).
          </li>
        </ul>
        <p className="mt-2">
          Submit requests to{" "}
          <a href="mailto:support@borodesk.com" className="text-blue-700 underline">
            support@borodesk.com
          </a>
          . We will respond within 30 days.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-2">9. Changes to this policy</h2>
        <p>
          We may update this policy from time to time. The effective date at the top of
          this page reflects the most recent revision. Continued use of SupersDeck after
          a policy update constitutes acceptance of the revised terms.
        </p>
      </section>
    </main>
  );
}
