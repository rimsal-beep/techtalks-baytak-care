import LegalPage from "@/app/Components/LegalPage";
import { CONTACT_EMAIL, LEGAL_UPDATED } from "@/lib/siteInfo";

export const metadata = { title: "Terms of Service | Baytak Care" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated={LEGAL_UPDATED}>
      <p>
        By creating an account or using Baytak Care, you agree to these terms. If you do not agree,
        please do not use the service.
      </p>

      <h2>The service</h2>
      <p>
        Baytak Care is a platform where property owners and local caretakers track maintenance
        requests, monthly checks, photos, and approvals for a property. Baytak Care is currently in
        a pilot phase, so features may change and the service may have interruptions.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>Give accurate information and keep your password private.</li>
        <li>You are responsible for activity on your account.</li>
        <li>Owners invite caretakers by email. A caretaker can look after one property at a time.</li>
      </ul>

      <h2>Acceptable use</h2>
      <ul>
        <li>Do not use the service for anything illegal or harmful.</li>
        <li>Do not upload content you do not have the right to share.</li>
        <li>Do not try to access accounts, properties, or data that are not yours.</li>
        <li>Do not disrupt or attack the service.</li>
      </ul>

      <h2>Your content</h2>
      <p>
        You keep ownership of the photos and information you upload. You allow us to store and
        display them only as needed to run the service for you and the people you work with on it.
      </p>

      <h2>Repairs, costs, and caretakers</h2>
      <p>
        Baytak Care records and organizes requests and approvals. We do not carry out repairs and
        we do not guarantee the work, pricing, or conduct of any caretaker or contractor. Agreements
        and payments are between owners, caretakers, and contractors.
      </p>

      <h2>No warranty</h2>
      <p>
        The service is provided as is, without promises that it will always be available or free of
        errors. To the extent allowed by law, Baytak Care is not liable for indirect or
        consequential losses that come from using the service.
      </p>

      <h2>Ending your use</h2>
      <p>
        You can stop using Baytak Care at any time and ask us to delete your account. We may suspend
        accounts that break these terms.
      </p>

      <h2>Changes</h2>
      <p>If we change these terms, we will update the date at the top of this page.</p>

      <h2>Contact</h2>
      <p>
        Questions about these terms? Email us at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}