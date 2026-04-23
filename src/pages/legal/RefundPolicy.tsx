import { Wallet } from "lucide-react";
import LegalPageLayout from "@/components/legal/LegalPageLayout";

export default function RefundPolicy() {
  return (
    <LegalPageLayout
      title="Refund Policy"
      subtitle="Our policy on subscription payments, refunds, and exceptions."
      icon={<Wallet />}
      metaTitle="Refund Policy — Growvix By Offdx"
      metaDescription="Growvix's refund policy for SaaS subscriptions. Learn about our no-refund policy and limited exceptions."
    >
      <p><em>Last updated: {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</em></p>

      <h2>1. Subscription Model</h2>
      <p>
        Growvix operates on a <strong>SaaS subscription model</strong>, available on
        monthly and annual billing cycles. Customers are charged at the start of each
        billing period, and access continues until the end of that period.
      </p>

      <div className="my-6 rounded-2xl border border-warning/30 bg-warning/5 p-5">
        <h3 className="text-base font-semibold text-foreground mb-1">⚠️ No-Refund Policy</h3>
        <p className="text-sm text-muted-foreground m-0">
          Due to the digital and instantly accessible nature of our Service,
          <strong className="text-foreground"> all subscription payments are final and non-refundable</strong>,
          including unused portions of the billing cycle.
        </p>
      </div>

      <h2>2. Free Trial</h2>
      <p>
        We strongly encourage all customers to use the <strong>free trial</strong> before
        subscribing. The trial gives you full access to evaluate features so you can make
        an informed purchase decision.
      </p>

      <h2>3. Exceptions</h2>
      <p>Refunds may be considered only in the following limited circumstances:</p>
      <ul>
        <li><strong>Duplicate payment:</strong> If you were charged twice for the same subscription period due to a technical error.</li>
        <li><strong>Unauthorized transaction:</strong> If a charge was made without your authorization (subject to verification).</li>
        <li><strong>Service unavailable:</strong> If a confirmed, prolonged outage (over 7 consecutive days) prevented access and was not resolved by support.</li>
        <li><strong>Statutory requirements:</strong> Where mandated by applicable consumer protection laws.</li>
      </ul>

      <h2>4. Cancellation</h2>
      <p>
        You can cancel your subscription anytime from <strong>Account Settings</strong>.
        Cancellation stops auto-renewal; you retain access until the end of the current
        paid period. No partial refunds are issued for the unused portion.
      </p>

      <h2>5. International Payments & GST</h2>
      <ul>
        <li>Indian customers are billed in INR with applicable <strong>GST</strong>.</li>
        <li>International customers are billed in USD; local taxes may apply.</li>
        <li>Payment gateway fees and bank charges are non-refundable in all cases.</li>
      </ul>

      <h2>6. How to Request a Refund</h2>
      <p>
        Eligible refund requests must be submitted within <strong>7 days</strong> of the
        transaction. Email{" "}
        <a href="mailto:support@growvix.offdx.in">support@growvix.offdx.in</a> with your
        registered email, transaction ID, and reason. Approved refunds are processed
        within <strong>7–10 business days</strong> to the original payment method.
      </p>

      <h2>7. Contact</h2>
      <p>
        Questions about this policy?{" "}
        <a href="mailto:support@growvix.offdx.in">support@growvix.offdx.in</a>
      </p>
    </LegalPageLayout>
  );
}
