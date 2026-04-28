import { LegalPageLayout } from "./legal-page-layout";

export function TermsOfUse() {
  return (
    <LegalPageLayout title="Terms of Use">
      <div className="space-y-3">
        <p className="text-sm">Effective date: April 27, 2026</p>
        <p>
          These Terms of Use govern your access to and use of Rankio (the “Service”). By accessing or using the Service,
          you agree to these terms.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">1. Using the Service</h2>
        <p>
          You may use the Service only in compliance with applicable laws and these terms. You are responsible for
          activity that occurs under your account.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">2. Accounts and Security</h2>
        <p>
          Keep your login credentials secure. If you believe your account has been compromised, contact us and sign out
          of all sessions where possible.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">3. Acceptable Use</h2>
        <p>
          Do not misuse the Service, interfere with its operation, attempt to access it using unauthorized methods, or
          upload content that is unlawful or infringes others’ rights.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">4. Subscriptions and Billing</h2>
        <p>
          If you purchase a paid plan, you agree to pay the fees shown at checkout. Payments may be non-refundable except
          where required by law or as stated in a plan’s terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">5. Intellectual Property</h2>
        <p>
          The Service, including its software and branding, is owned by Rankio or its licensors. You receive a limited
          license to use the Service as provided in these terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">6. Disclaimer</h2>
        <p>
          The Service is provided “as is” and “as available”. Rankio does not warrant that the Service will be
          uninterrupted or error-free.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">7. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Rankio will not be liable for indirect, incidental, special,
          consequential, or punitive damages arising from your use of the Service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">8. Changes</h2>
        <p>
          We may update these terms from time to time. Continued use of the Service after changes become effective means
          you accept the updated terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">9. Contact</h2>
        <p>
          Questions about these terms? Contact us at <span className="text-primary">support@rankio.ai</span>.
        </p>
      </section>
    </LegalPageLayout>
  );
}

