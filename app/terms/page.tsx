import type { Metadata } from "next";
import LegalShell from "@/components/legal/LegalShell";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `The terms governing your use of ${siteConfig.name}.`,
  alternates: { canonical: "/terms" },
};

const LAST_UPDATED = "June 5, 2026";

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" lastUpdated={LAST_UPDATED}>
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use
        of {siteConfig.name} (the &quot;Service&quot;). By creating an account or
        using the Service, you agree to these Terms. If you do not agree, please
        do not use the Service.
      </p>

      <h2>1. Eligibility</h2>
      <p>
        You must be at least 13 years old to use the Service. By using it, you
        represent that you meet this requirement and that the information you
        provide is accurate.
      </p>

      <h2>2. Your Account</h2>
      <ul>
        <li>You are responsible for keeping your login credentials secure.</li>
        <li>You are responsible for all activity that occurs under your account.</li>
        <li>Notify us promptly of any unauthorized use.</li>
      </ul>

      <h2>3. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Abuse, overload, scrape, or attempt to disrupt the Service or its APIs.</li>
        <li>Reverse engineer or attempt to gain unauthorized access to any part of the Service.</li>
        <li>Upload unlawful, harmful, or infringing content, or harass other users.</li>
        <li>Manipulate leaderboards, XP, or other gamified metrics through fraudulent means.</li>
      </ul>

      <h2>4. LeetCode Data</h2>
      <p>
        {siteConfig.name} reads your public LeetCode statistics and, with your
        explicit consent, your solve history to power tracking and analytics. We
        are not affiliated with, endorsed by, or sponsored by LeetCode. You are
        responsible for complying with LeetCode&apos;s own terms when connecting
        your account.
      </p>

      <h2>5. AI Mentor</h2>
      <p>
        The AI mentor provides automated guidance and may produce inaccurate or
        incomplete information. It is a study aid, not professional or career
        advice. Verify important information independently.
      </p>

      <h2>6. Subscriptions &amp; Payments</h2>
      <p>
        Certain features may require a paid subscription. Pricing and billing
        terms are presented at the point of purchase. Unless required by law,
        fees are non-refundable. You may cancel at any time, and access continues
        until the end of the current billing period.
      </p>

      <h2>7. Intellectual Property</h2>
      <p>
        The Service, including its design, code, and curated content, is owned by
        {" "}{siteConfig.name} and protected by applicable laws. Curated problem
        sets, sheets, and third-party content remain the property of their
        respective owners. You retain ownership of the content you create (such
        as notes), and grant us a limited license to store and display it to
        operate the Service for you.
      </p>

      <h2>8. Disclaimers</h2>
      <p>
        The Service is provided &quot;as is&quot; and &quot;as available&quot;
        without warranties of any kind, whether express or implied. We do not
        guarantee that the Service will be uninterrupted, error-free, or that it
        will result in any particular interview or placement outcome.
      </p>

      <h2>9. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, {siteConfig.name} shall not be
        liable for any indirect, incidental, or consequential damages, or for any
        loss of data, arising out of your use of the Service.
      </p>

      <h2>10. Termination</h2>
      <p>
        You may delete your account at any time from Settings. We may suspend or
        terminate access if you violate these Terms or use the Service in a way
        that could harm us or other users.
      </p>

      <h2>11. Changes to These Terms</h2>
      <p>
        We may update these Terms from time to time. Continued use of the Service
        after changes take effect constitutes acceptance of the revised Terms.
      </p>

      <h2>12. Contact</h2>
      <p>
        Questions about these Terms? Email us at{" "}
        <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>.
      </p>
    </LegalShell>
  );
}
