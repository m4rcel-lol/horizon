import { Link } from "react-router-dom";
import { LegalDocument, Section } from "../components/LegalDocument";

export function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      updated="11 August 2026"
      intro="This describes what Horizon, the software, collects and stores. Because Horizon is self-hosted, the people who run this particular instance are the ones responsible for your data — not the authors of the software."
    >
      <Section title="Who holds your data">
        <p>
          This instance is operated independently. Whoever runs the server can read anything stored
          on it, including your email address, your posts, and your direct messages. That is true of
          every self-hosted platform, and it is worth knowing before you sign up.
        </p>
        <p>
          The administrators are expected to publish contact details for privacy requests. If they
          have not, ask them before trusting the instance with anything sensitive.
        </p>
      </Section>

      <Section title="What the software stores">
        <ul>
          <li>
            <strong>Account details</strong> — your username, display name, email address, an
            Argon2id hash of your password (never the password itself), your bio, and your avatar and
            banner if you upload them.
          </li>
          <li>
            <strong>Content you create</strong> — posts, replies, Community Notes you write, and the
            ratings you give other people&apos;s notes.
          </li>
          <li>
            <strong>Sessions</strong> — one record per device you sign in on, holding a hash of the
            session token, the browser&apos;s user-agent string, the IP address it was created from,
            and when it was last used. You can see and revoke these in{" "}
            <Link to="/settings" className="link">
              settings
            </Link>
            .
          </li>
          <li>
            <strong>Verification history</strong> — changes to an account&apos;s verification tier,
            including who made the change, so that badges are auditable.
          </li>
        </ul>
      </Section>

      <Section title="What the software does not do">
        <ul>
          <li>No advertising, and no sale or sharing of personal data with advertisers.</li>
          <li>No third-party analytics or tracking scripts. There is no tracking pixel.</li>
          <li>
            No behavioural profiling. Feed ranking uses plain, published signals an administrator
            configures — not a model trained on what you look at.
          </li>
          <li>No AI features anywhere in the stack, and no data sent to any AI service.</li>
        </ul>
      </Section>

      <Section title="What other people can see">
        <p>
          Your profile, your posts, and who you are affiliated with are public by default — visible
          to anyone on the internet, signed in or not, and to other servers if federation is enabled.
          Direct messages are visible to their participants and to anyone with database access on
          this server.
        </p>
        <p>
          Community Notes are published under the instance&apos;s{" "}
          <Link to="/CommunityNotes" className="link">
            @CommunityNotes
          </Link>{" "}
          account. Whether a note credits its author by name is an instance setting.
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          One cookie, <code>horizon_session</code>, which identifies your signed-in session. It is
          HttpOnly, so scripts on the page cannot read it, and it is marked Secure in production so
          it never travels over plain HTTP. If you turn off &ldquo;stay signed in&rdquo;, it is
          removed when you close the browser.
        </p>
        <p>Your theme preference is kept in local storage on your device, not on the server.</p>
      </Section>

      <Section title="Keeping and deleting data">
        <p>
          Content stays until you delete it or the instance is shut down. Deleting your account
          removes your profile and content from this server, but copies that other servers or people
          already fetched are outside its reach.
        </p>
        <p>
          Backups may hold your data for a while after deletion. Ask the administrators what their
          backup retention actually is.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          Depending on where you live you may have rights to access, correct, export or erase your
          data. Those rights are exercised against the operators of this instance, who are the data
          controller. The software provides account deletion and data export to support them.
        </p>
      </Section>

      <Section title="A note to whoever runs this server">
        <p>
          This document ships with the software as an honest description of what Horizon does. It is
          not legal advice and it is not automatically compliant with the GDPR, the UK GDPR, CCPA or
          anything else. Before opening registrations, review it, add your identity and contact
          details, your lawful basis for processing, your actual backup retention, and any processors
          you use.
        </p>
      </Section>
    </LegalDocument>
  );
}
