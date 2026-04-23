import { ShieldCheck } from "lucide-react";
import LegalPageLayout from "@/components/legal/LegalPageLayout";

export default function PrivacyPolicy() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      subtitle="How we collect, use, and protect your data on Growvix."
      icon={<ShieldCheck />}
      metaTitle="Privacy Policy — Growvix By Offdx"
      metaDescription="Learn how Growvix By Offdx collects, uses, stores, and protects your personal and business data."
    >
      <p><em>Last updated: {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</em></p>

      <h2>1. Information We Collect</h2>
      <ul>
        <li><strong>Account information:</strong> name, email, mobile number, password</li>
        <li><strong>Business profile:</strong> brand name, industry, audience, goals, brand assets</li>
        <li><strong>Payment information:</strong> processed securely by Cashfree (India) and Stripe (Global). We do not store full card details.</li>
        <li><strong>Social account tokens:</strong> OAuth tokens for connected platforms (encrypted)</li>
        <li><strong>Usage data:</strong> generated content, analytics, log data, IP address, device type</li>
      </ul>

      <h2>2. How We Use Your Data</h2>
      <ul>
        <li>To provide, maintain, and improve the Service</li>
        <li>To generate AI content tailored to your brand</li>
        <li>To publish content to platforms you have authorized</li>
        <li>To process payments and manage subscriptions</li>
        <li>To send service notifications, billing updates, and product news</li>
        <li>To detect fraud, abuse, and ensure platform security</li>
      </ul>

      <h2>3. Data Sharing</h2>
      <p>We do <strong>not sell</strong> your personal data. We share data only with:</p>
      <ul>
        <li><strong>AI providers</strong> (e.g., Google, OpenAI) to generate content</li>
        <li><strong>Payment gateways</strong> (Cashfree, Stripe) to process transactions</li>
        <li><strong>Cloud infrastructure providers</strong> for hosting and storage</li>
        <li><strong>Authorities</strong> when legally required</li>
      </ul>

      <h2>4. Data Security</h2>
      <p>
        We use industry-standard encryption (TLS in transit, AES at rest), Row-Level
        Security on our databases, and strict access controls. While we take all
        reasonable measures, no system is 100% secure.
      </p>

      <h2>5. Data Retention</h2>
      <p>
        We retain your data for as long as your account is active. When you delete your
        account, a <strong>comprehensive data purge</strong> is triggered, removing your
        profile, content, social tokens, and brand assets within 30 days, except where
        retention is required by law.
      </p>

      <h2>6. Your Rights</h2>
      <ul>
        <li>Access, correct, or export your personal data</li>
        <li>Delete your account and trigger full data purge</li>
        <li>Withdraw consent for marketing communications</li>
        <li>Lodge a complaint with a data protection authority</li>
      </ul>

      <h2>7. Cookies</h2>
      <p>
        We use essential cookies for authentication and session management, and analytics
        cookies to improve the Service. You can control cookies via your browser settings.
      </p>

      <h2>8. International Transfers</h2>
      <p>
        Your data may be processed in regions outside your country (e.g., for AI
        generation). We ensure appropriate safeguards are in place.
      </p>

      <h2>9. Children's Privacy</h2>
      <p>
        Growvix is not intended for users under 18. We do not knowingly collect data
        from children.
      </p>

      <h2>10. Contact</h2>
      <p>
        For privacy questions or data requests, email{" "}
        <a href="mailto:support@growvix.offdx.in">support@growvix.offdx.in</a>.
      </p>
      <p>
        <strong>Data Controller:</strong> Offdx (parent company of Growvix),
        Dhanbad, Jharkhand, India. GSTIN: 20DCSPM1849C1ZP.
      </p>
    </LegalPageLayout>
  );
}
