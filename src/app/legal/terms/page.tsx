export const metadata = {
  title: "Terms of Service — SupersDeck",
};

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 text-sm text-gray-700 leading-relaxed">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Terms of Service</h1>
      <p className="text-xs text-gray-400 mb-8">Effective date: June 2026</p>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-2">1. Acceptance</h2>
        <p>
          By accessing or using SupersDeck, you agree to these Terms of Service. If you
          are using SupersDeck on behalf of an organization (a property-management
          company, housing authority, or co-operative), you represent that you have
          authority to bind that organization to these terms.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-2">2. Description of service</h2>
        <p>
          SupersDeck is a property-operations platform that helps New York City
          residential building superintendents and property managers track work orders,
          HPD violations, compliance certifications, contractor credentials, and resident
          communications. Features include AI-assisted summaries, automated cron-based
          alerts, and a public tenant intake form.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-2">3. Permitted use</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            SupersDeck is intended for lawful property-management purposes only.
          </li>
          <li>
            You may not use SupersDeck to collect data on individuals without a lawful
            basis, to harass tenants, or to circumvent any housing law or regulation.
          </li>
          <li>
            Automated scraping of any SupersDeck page or API endpoint beyond normal
            application use is prohibited without written consent.
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-2">4. Accounts and access</h2>
        <p>
          You are responsible for maintaining the confidentiality of your credentials.
          You must notify us immediately at{" "}
          <a href="mailto:support@borodesk.com" className="text-blue-700 underline">
            support@borodesk.com
          </a>{" "}
          if you suspect unauthorized access to your account. We reserve the right to
          suspend accounts that violate these terms or that pose a security risk.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-2">
          5. AI-generated content
        </h2>
        <p>
          SupersDeck uses Anthropic&rsquo;s Claude API to generate work-order summaries,
          compliance suggestions, and voice-call transcripts. AI-generated output is
          provided for informational purposes only and does not constitute legal, housing,
          or compliance advice. You are solely responsible for verifying AI output before
          acting on it. We make no warranty regarding the accuracy or completeness of
          AI-generated content.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-2">
          6. Voice recording disclosure
        </h2>
        <p>
          When the AI voice-receptionist feature is active, calls to the configured
          number are recorded and transcribed. New York is an all-party consent state
          under New York Penal Law § 250.05. By enabling this feature, you agree to
          disclose call recording to all parties at the start of each call with a
          disclosure message such as: &ldquo;This call may be recorded for operational
          purposes.&rdquo; You bear sole responsibility for compliance with applicable
          recording-consent laws.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-2">7. Data and privacy</h2>
        <p>
          Your use of SupersDeck is also governed by our{" "}
          <a href="/legal/privacy" className="text-blue-700 underline">
            Privacy Policy
          </a>
          , which is incorporated into these terms by reference.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-2">
          8. Disclaimer of warranties
        </h2>
        <p>
          SupersDeck is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;
          without warranty of any kind, express or implied, including but not limited to
          warranties of merchantability, fitness for a particular purpose, or
          non-infringement. We do not warrant that the service will be uninterrupted,
          error-free, or that HPD violation data will be complete or up to date (it
          depends on NYC Open Data availability).
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-2">
          9. Limitation of liability
        </h2>
        <p>
          To the maximum extent permitted by law, our aggregate liability to you for any
          claim arising out of or related to SupersDeck is limited to the amounts you
          paid us in the 12 months preceding the claim. We are not liable for indirect,
          incidental, consequential, or punitive damages.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-2">10. Governing law</h2>
        <p>
          These terms are governed by the laws of the State of New York, without regard
          to conflict-of-law principles. Any dispute shall be resolved in the courts of
          New York County, New York.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-2">11. Changes to terms</h2>
        <p>
          We may update these terms. Continued use of SupersDeck after the updated
          effective date constitutes your acceptance. For material changes, we will
          attempt to notify admin users by email.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-2">12. Contact</h2>
        <p>
          Questions about these terms:{" "}
          <a href="mailto:support@borodesk.com" className="text-blue-700 underline">
            support@borodesk.com
          </a>
          .
        </p>
      </section>
    </main>
  );
}
