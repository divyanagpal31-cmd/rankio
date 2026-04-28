import { LegalPageLayout } from "./legal-page-layout";

export function PrivacyPolicy() {
  return (
    <LegalPageLayout title="Privacy Policy">
      <div className="space-y-3">
        <p className="text-sm">Effective date: April 27, 2026</p>
        <p>
          This Privacy Policy explains how Rankio collects, uses, and shares information when you use the Service.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">1. Information We Collect</h2>
        <p>
          We may collect account information (such as name and email), usage information (such as feature interactions),
          and website URLs or scan inputs you provide to generate reports.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">2. How We Use Information</h2>
        <p>
          We use information to operate the Service, generate reports, improve performance, provide customer support, and
          communicate service-related updates.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">3. Sharing</h2>
        <p>
          We may share information with service providers who help us run the Service, or when required by law. We do not
          sell your personal information.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">4. Data Retention</h2>
        <p>
          We retain information for as long as needed to provide the Service and for legitimate business purposes, unless
          a longer retention period is required by law.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">5. Your Choices</h2>
        <p>
          You can update certain account details through your settings and may request deletion of your account by
          contacting support.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">6. Security</h2>
        <p>
          We use reasonable safeguards designed to protect information. No method of transmission or storage is 100%
          secure.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">7. Contact</h2>
        <p>
          Questions about privacy? Contact us at <span className="text-primary">privacy@rankio.ai</span>.
        </p>
      </section>
    </LegalPageLayout>
  );
}

