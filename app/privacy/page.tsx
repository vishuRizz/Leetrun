import type { Metadata } from "next";
import LegalShell from "@/components/legal/LegalShell";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${siteConfig.name} collects, uses, and protects your data.`,
  alternates: { canonical: "/privacy" },
};

const LAST_UPDATED = "June 5, 2026";

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" lastUpdated={LAST_UPDATED}>
      <p>
        This Privacy Policy explains how {siteConfig.name} (&quot;we&quot;,
        &quot;us&quot;) collects, uses, and safeguards your information when you
        use our DSA interview-preparation platform (the &quot;Service&quot;). By
        using {siteConfig.name}, you agree to the practices described here.
      </p>

      <h2>1. Information We Collect</h2>
      <h3>Information you provide</h3>
      <ul>
        <li>
          <strong>Account details</strong> — your name, email address, and (via
          Google sign-in) your profile photo.
        </li>
        <li>
          <strong>Onboarding preferences</strong> — target company, college,
          graduation year, preferred difficulty, and daily goals.
        </li>
        <li>
          <strong>Content you create</strong> — problem notes, study plans,
          flashcard progress, and messages you send to the AI mentor.
        </li>
      </ul>
      <h3>Information from connected services</h3>
      <ul>
        <li>
          <strong>LeetCode</strong> — your public LeetCode username, solved
          problem counts, submission history, contest rating, and submission
          calendar. If you opt in to deep sync, you provide a LeetCode session
          cookie which we store <strong>encrypted</strong> and use only to fetch
          your own solve history.
        </li>
      </ul>
      <h3>Information collected automatically</h3>
      <ul>
        <li>
          Basic usage events (e.g. syncs, quest completions) and standard server
          logs used to operate and improve the Service.
        </li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>To provide core features: progress tracking, analytics, leaderboards, quests, and your public profile.</li>
        <li>To personalize the AI mentor and recommendations based on your real prep data.</li>
        <li>To send transactional and (optional) reminder emails.</li>
        <li>To maintain security, prevent abuse, and improve the Service.</li>
      </ul>

      <h2>3. Third-Party Services</h2>
      <p>We rely on trusted processors to run the Service, including:</p>
      <ul>
        <li><strong>Supabase</strong> — authentication and database hosting.</li>
        <li><strong>Groq</strong> and <strong>Google (Gemini)</strong> — AI mentor responses. Your messages and a summary of your prep stats are sent to generate replies.</li>
        <li><strong>Resend</strong> — transactional and reminder emails.</li>
        <li><strong>LeetCode</strong> — to read your public stats and (with consent) your solve history.</li>
        <li>Our hosting provider for serving the application.</li>
      </ul>
      <p>We do not sell your personal data.</p>

      <h2>4. Cookies</h2>
      <p>
        We use essential cookies to keep you signed in and maintain your session.
        We do not use third-party advertising cookies.
      </p>

      <h2>5. Data Retention</h2>
      <p>
        We retain your data for as long as your account is active. You can delete
        your account at any time from <strong>Settings → Danger Zone</strong>,
        which permanently removes your data from our systems.
      </p>

      <h2>6. Your Rights</h2>
      <ul>
        <li><strong>Access &amp; portability</strong> — export all your data as JSON from Settings.</li>
        <li><strong>Deletion</strong> — permanently delete your account and associated data.</li>
        <li><strong>Correction</strong> — update your profile and preferences at any time.</li>
      </ul>

      <h2>7. Security</h2>
      <p>
        We use industry-standard measures to protect your data, including
        encryption of sensitive credentials. No method of transmission or storage
        is 100% secure, but we work to protect your information.
      </p>

      <h2>8. Children&apos;s Privacy</h2>
      <p>
        The Service is not directed to children under 13, and we do not knowingly
        collect their personal information.
      </p>

      <h2>9. Changes to This Policy</h2>
      <p>
        We may update this policy from time to time. Material changes will be
        reflected by updating the &quot;Last updated&quot; date above.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions about this policy? Email us at{" "}
        <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>.
      </p>
    </LegalShell>
  );
}
