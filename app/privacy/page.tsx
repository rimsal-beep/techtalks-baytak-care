import LegalPage from "@/app/Components/LegalPage";
import { CONTACT_EMAIL, LEGAL_UPDATED } from "@/lib/siteInfo";

export const metadata = { title: "Privacy Policy | Baytak Care" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated={LEGAL_UPDATED}>
      <p>
        Baytak Care helps property owners who live away from Lebanon stay connected to their homes
        through local caretakers. This page explains what information we collect, why, and the
        choices you have. Baytak Care is currently in a pilot phase.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>Account details: your name, email address, optional phone number, and your role (owner or caretaker). Your password is stored in a protected, hashed form and we cannot read it.</li>
        <li>Property details: the address and city of the properties you add.</li>
        <li>Maintenance information: requests, descriptions, estimates, approvals, rejection reasons, and the photos and receipts you upload.</li>
        <li>Activity records: a log of actions taken on requests, so owners and caretakers can see what happened and when.</li>
        <li>Invitations: the email address a caretaker is invited with.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To create and secure your account and verify your email.</li>
        <li>To let owners and their caretakers manage a property together.</li>
        <li>To send emails about your account, such as verification and caretaker invitations.</li>
      </ul>
      <p>We do not sell your information and we do not use it for advertising.</p>

      <h2>Who can see your information</h2>
      <p>
        Owners can see their own properties and requests. A caretaker can only see the property
        they are assigned to and the requests for it. We use trusted service providers for hosting,
        file storage, and email delivery. They process data only to run the service.
      </p>

      <h2>Cookies</h2>
      <p>We use only the essential cookies needed to keep you signed in. We do not use advertising or tracking cookies.</p>

      <h2>Keeping and deleting your data</h2>
      <p>
        We keep your information while your account is active. You can ask us to correct or delete
        your account and related data at any time by emailing{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2>Children</h2>
      <p>Baytak Care is not meant for people under 18.</p>

      <h2>Changes to this policy</h2>
      <p>If we change this policy, we will update the date at the top of this page.</p>

      <h2>Contact</h2>
      <p>
        Questions about your privacy? Email us at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}