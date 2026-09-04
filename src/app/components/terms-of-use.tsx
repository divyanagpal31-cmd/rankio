import { LegalPageLayout } from "./legal-page-layout";

export function TermsOfUse() {
  return (
    <LegalPageLayout title="Terms of Use">
      <section className="space-y-3">
        <p className="text-sm">Last Updated: August 20, 2026</p>
        <p>Welcome to Rankio.ai.</p>
        <p>
          These Terms of Use ("Terms") govern your access to and use of Rankio.ai, including our website analysis
          tools, AI Visibility Reports, recommendations, content, and related services (collectively, the "Services").
        </p>
        <p>
          By accessing or using Rankio.ai, you agree to these Terms. If you do not agree with these Terms, please do
          not use the Services.
        </p>
        <p>
          If you use Rankio on behalf of a company, business, or organization, you represent that you have authority
          to accept these Terms on its behalf.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">1. About Rankio</h2>
        <p>
          Rankio is a website analysis and reporting platform designed to help businesses understand technical,
          structural, content, brand, and other signals that may influence how their websites are interpreted and
          discovered through search engines and AI-powered search experiences.
        </p>
        <p>Rankio</p>
        <p>201 Global Business Park, SAS Nagar, India</p>
        <p>
          Email: <span className="text-primary">support@rankio.ai</span>
        </p>
        <p>Rankio is an independent technology platform.</p>
        <p>
          Unless expressly stated otherwise, Rankio is not affiliated with, endorsed by, or operated by Google,
          Microsoft, OpenAI, Anthropic, Perplexity, or any other search engine, AI provider, or technology company.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">2. Eligibility</h2>
        <p>
          You may use Rankio only if you are legally capable of entering into a binding agreement under applicable law.
        </p>
        <p>
          If you use Rankio on behalf of an organization, you confirm that you have authority to bind that organization
          to these Terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">3. Website Submission and Authorization</h2>
        <p>When you submit a website URL for analysis, you confirm that:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>You own the website;</li>
          <li>You operate the website; or</li>
          <li>You have appropriate authorization to request its analysis.</li>
        </ul>
        <p>
          You are responsible for ensuring that your use of Rankio does not violate the rights of the website owner or
          any third party.
        </p>
        <p>Rankio is not responsible for determining whether you have authorization to submit a website.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">4. Acceptable Use</h2>
        <p>You agree to use Rankio only for lawful purposes.</p>
        <p>You must not:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Use Rankio to violate applicable laws or regulations</li>
          <li>Submit websites without appropriate authorization</li>
          <li>Attempt to gain unauthorized access to Rankio systems</li>
          <li>Circumvent usage limits or security mechanisms</li>
          <li>Introduce malware or malicious code</li>
          <li>Interfere with the operation of Rankio</li>
          <li>Abuse automated systems or submit excessive requests intended to disrupt the Services</li>
          <li>Reverse engineer or attempt to extract proprietary source code except where permitted by law</li>
          <li>Scrape Rankio's proprietary data without permission</li>
          <li>
            Misrepresent a Rankio report as an official certification, ranking, or assessment issued by a search
            engine or AI provider
          </li>
          <li>Use Rankio to infringe intellectual-property, privacy, or other rights of third parties</li>
        </ul>
        <p>Rankio may suspend or restrict access where it reasonably believes these Terms have been violated.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">5. Website Analysis</h2>
        <p>Rankio may retrieve and analyze publicly accessible information from the website submitted by you.</p>
        <p>Depending on the website and technical circumstances, the analysis may include:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Website structure</li>
          <li>Technical signals</li>
          <li>Accessibility signals</li>
          <li>Structured data</li>
          <li>Content organization</li>
          <li>Metadata</li>
          <li>Internal links</li>
          <li>Robots.txt</li>
          <li>XML sitemap</li>
          <li>Brand information</li>
          <li>Other publicly accessible signals</li>
        </ul>
        <p>
          Rankio cannot guarantee that every page, resource, or website element will be successfully accessed or
          analyzed.
        </p>
        <p>
          Website configuration, server restrictions, robots.txt directives, authentication requirements, rate limits,
          network conditions, website changes, or third-party systems may affect analysis results.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">6. AI Visibility Reports</h2>
        <p>Rankio Reports may include:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>AI Visibility Score</li>
          <li>Technical analysis</li>
          <li>Accessibility findings</li>
          <li>Website structure analysis</li>
          <li>Structured-data analysis</li>
          <li>Content understanding insights</li>
          <li>Brand understanding insights</li>
          <li>AI citation-visibility observations</li>
          <li>Prioritized recommendations</li>
          <li>Action plans</li>
        </ul>
        <p>Reports are intended to provide useful information and decision-support insights.</p>
        <p>
          They should not be considered legal, financial, medical, cybersecurity, or other regulated professional
          advice.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">7. Scores and Methodology</h2>
        <p>
          Rankio scores are proprietary assessments based on the evaluation criteria and methodology used by Rankio at
          the time a report is generated.
        </p>
        <p>
          A Rankio score is not an official score issued by Google, Microsoft, OpenAI, Anthropic, Perplexity, or
          another search engine or AI provider.
        </p>
        <p>
          Rankio may update or change its methodology, scoring system, data sources, or evaluation criteria from time
          to time.
        </p>
        <p>Consequently, scores generated at different times may not always be directly comparable.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">8. No Guarantee of Search or AI Results</h2>
        <p>Rankio does not guarantee that following a Rankio report or recommendation will result in:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Higher search rankings</li>
          <li>Increased organic traffic</li>
          <li>Increased conversions</li>
          <li>Increased sales</li>
          <li>Inclusion in Google AI Overviews</li>
          <li>Inclusion in AI-generated answers</li>
          <li>Citations by ChatGPT, Gemini, Claude, Perplexity, or other AI systems</li>
          <li>Recommendations by an AI assistant</li>
          <li>Improved visibility on any particular search engine or AI platform</li>
        </ul>
        <p>
          Search engines and AI systems are controlled by third parties and use proprietary systems that may change
          without notice.
        </p>
        <p>Rankio provides assessments based on the information and methodology available at the time of analysis.</p>
        <p>Actual results may vary.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">9. Reports and Deliverables</h2>
        <p>
          A purchased Rankio report provides an analysis of the website submitted by the customer and the report
          generated from that analysis.
        </p>
        <p>Reports may be delivered through:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Downloadable files</li>
          <li>Online interfaces</li>
          <li>Email</li>
          <li>Other digital delivery methods</li>
        </ul>
        <p>
          The exact deliverables are determined by the product or pricing plan presented at the time of purchase.
        </p>
        <p>
          Rankio does not modify your website as part of a standard report unless a separate service expressly states
          otherwise.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">10. Pricing and Payment</h2>
        <p>Rankio may offer one-time reports, report bundles, agency services, or other paid products.</p>
        <p>Prices and included features will be displayed before purchase.</p>
        <p>Applicable taxes may be added where required.</p>
        <p>Payments may be processed through third-party payment providers.</p>
        <p>
          By completing a purchase, you authorize the applicable payment provider to process the transaction according
          to the payment terms presented during checkout.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">11. Refunds</h2>
        <p>Rankio's refund and cancellation terms are described in the Refund Policy published on Rankio.ai.</p>
        <p>
          Because Rankio reports involve automated website analysis and generation of a customized digital deliverable,
          refunds may be limited once report processing has begun or the report has been delivered, subject to
          applicable law.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">12. Intellectual Property</h2>
        <p>Rankio and its licensors retain all rights, title, and interest in:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Rankio software</li>
          <li>Website design</li>
          <li>Brand and trademarks</li>
          <li>Report templates</li>
          <li>Scoring methodology</li>
          <li>Algorithms</li>
          <li>Databases</li>
          <li>Documentation</li>
          <li>Proprietary content</li>
          <li>Other Rankio intellectual property</li>
        </ul>
        <p>
          You may use purchased reports for your internal business purposes and, where applicable, for legitimate
          client-service purposes.
        </p>
        <p>
          You may not copy, reproduce, resell, distribute, license, or commercially exploit Rankio's proprietary
          platform, methodology, templates, or underlying technology without written permission.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">13. Your Website Content</h2>
        <p>You retain ownership of content and materials belonging to you.</p>
        <p>
          You grant Rankio a limited, non-exclusive license to access, process, reproduce, and use website information
          as reasonably necessary to:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Perform the requested analysis</li>
          <li>Generate your report</li>
          <li>Deliver the Services</li>
          <li>Maintain and secure Rankio</li>
          <li>Improve the Services where permitted</li>
          <li>Comply with applicable law</li>
        </ul>
        <p>Rankio does not claim ownership of your website content.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">14. Feedback</h2>
        <p>
          If you voluntarily provide feedback, suggestions, ideas, or recommendations regarding Rankio, you grant
          Rankio permission to use that feedback to improve or develop its Services without compensation, to the extent
          permitted by law.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">15. Third-Party Services</h2>
        <p>
          Rankio may use third-party services for hosting, payments, analytics, AI processing, communications,
          security, and other infrastructure.
        </p>
        <p>Third-party services may be subject to their own terms and policies.</p>
        <p>Rankio is not responsible for services that are operated and controlled independently by third parties.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">16. Service Availability</h2>
        <p>Rankio aims to provide reliable Services but does not guarantee uninterrupted or error-free operation.</p>
        <p>Services may be temporarily unavailable due to:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Maintenance</li>
          <li>Software updates</li>
          <li>Technical issues</li>
          <li>Network failures</li>
          <li>Security incidents</li>
          <li>Third-party service interruptions</li>
          <li>Events outside our reasonable control</li>
        </ul>
        <p>
          Rankio may modify, suspend, or discontinue features or portions of the Services when reasonably necessary.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">17. Disclaimer of Warranties</h2>
        <p>
          To the maximum extent permitted by applicable law, the Services are provided on an "as is" and "as available"
          basis.
        </p>
        <p>Rankio does not warrant that:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>The Services will always be available</li>
          <li>Reports will always be error-free</li>
          <li>Every website will be completely analyzed</li>
          <li>Information in a report will always be current</li>
          <li>Recommendations will produce a particular business result</li>
          <li>Search engines or AI systems will implement or respond to Rankio recommendations</li>
        </ul>
        <p>You use the Services at your own discretion and risk.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">18. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by applicable law, Rankio and its directors, officers, employees, affiliates,
          contractors, and service providers will not be liable for indirect, incidental, special, consequential,
          exemplary, or punitive damages, or for loss of profits, revenue, business opportunities, goodwill, data, or
          anticipated savings arising from or related to your use of the Services.
        </p>
        <p>
          To the extent permitted by applicable law, Rankio's aggregate liability arising out of or relating to the
          Services will not exceed the amount you paid to Rankio for the specific Service giving rise to the claim
          during the twelve months preceding the event giving rise to the claim.
        </p>
        <p>
          Nothing in these Terms excludes or limits liability that cannot legally be excluded or limited under
          applicable law.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">19. Indemnification</h2>
        <p>
          To the extent permitted by applicable law, you agree to indemnify and hold harmless Rankio, its affiliates,
          directors, officers, employees, contractors, and service providers against claims, losses, liabilities,
          damages, costs, and expenses arising from:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Your misuse of the Services</li>
          <li>Your violation of these Terms</li>
          <li>Your violation of applicable law</li>
          <li>Your submission of a website without appropriate authorization</li>
          <li>Your infringement of another person's rights</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">20. Suspension and Termination</h2>
        <p>Rankio may suspend or terminate access to the Services if we reasonably believe:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>You have violated these Terms;</li>
          <li>Your activity creates a security or legal risk;</li>
          <li>Your activity may harm Rankio, users, or third parties; or</li>
          <li>Suspension is required by law.</li>
        </ul>
        <p>You may stop using Rankio at any time.</p>
        <p>Provisions that by their nature should survive termination will continue to apply.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">21. Changes to These Terms</h2>
        <p>Rankio may update these Terms from time to time.</p>
        <p>The updated Terms will be published on Rankio.ai with a revised "Last Updated" date.</p>
        <p>Where appropriate and required by law, Rankio may provide additional notice of material changes.</p>
        <p>
          Continued use of the Services after updated Terms become effective constitutes acceptance of the revised
          Terms to the extent permitted by applicable law.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">22. Governing Law and Jurisdiction</h2>
        <p>
          These Terms shall be governed by and interpreted in accordance with the laws of India, unless applicable
          mandatory law requires otherwise.
        </p>
        <p>
          Subject to applicable law, courts located in SAS Nagar, Punjab, India shall have jurisdiction over disputes
          arising out of or relating to these Terms or the Services.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">23. Severability</h2>
        <p>
          If any provision of these Terms is determined to be invalid or unenforceable, the remaining provisions will
          continue to apply to the extent permitted by law.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">24. Entire Agreement</h2>
        <p>
          These Terms, together with the Privacy Policy, Refund Policy, and any additional terms presented for specific
          Rankio Services, constitute the agreement between you and Rankio regarding your use of the Services.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary">25. Contact</h2>
        <p>For questions regarding these Terms, please contact:</p>
        <p>Rankio</p>
        <p>201 Global Business Park, SAS Nagar, India</p>
        <p>
          Email: <span className="text-primary">support@rankio.ai</span>
        </p>
        <p>
          Rankio is an independent technology platform and is not affiliated with or endorsed by Google, Microsoft,
          OpenAI, Anthropic, Perplexity, or other search-engine or AI providers unless expressly stated otherwise.
        </p>
      </section>
    </LegalPageLayout>
  );
}
