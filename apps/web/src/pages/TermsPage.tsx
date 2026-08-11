import { Link } from "react-router-dom";
import { LegalDocument, Section } from "../components/LegalDocument";

export function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Service"
      updated="11 August 2026"
      intro="These terms cover your use of this Horizon instance. Horizon is self-hosted software, so the agreement is between you and whoever runs this particular server."
    >
      <Section title="Using the service">
        <p>
          You need an account to post, reply, or rate Community Notes. You can read most of the
          instance without one. You must be old enough to consent to the processing of your data
          where you live — commonly 13, 16 in parts of the EU. The administrators may set a higher
          minimum.
        </p>
        <p>
          You are responsible for your account, including keeping your password to yourself. Tell the
          administrators promptly if you think someone else has access to it.
        </p>
      </Section>

      <Section title="Your content stays yours">
        <p>
          You keep ownership of what you post. By posting, you grant this instance the permission it
          needs to actually operate: to store your content, show it to other people, and — if
          federation is enabled — send it to other servers that your audience is on.
        </p>
        <p>
          That permission ends for new distribution when you delete something, but copies already
          fetched by other servers or people are beyond this instance&apos;s control.
        </p>
      </Section>

      <Section title="What you may not do">
        <ul>
          <li>Break the law, or use the instance to help someone else break it.</li>
          <li>
            Post content that sexualises children, incites violence, or targets people with
            harassment on the basis of who they are.
          </li>
          <li>Impersonate a person or organisation in a way designed to deceive.</li>
          <li>
            Abuse verification or affiliation — for example, an organisation affiliating accounts it
            has no relationship with in order to lend them credibility.
          </li>
          <li>Publish other people&apos;s private information without their consent.</li>
          <li>
            Attack the service: scraping at a rate that degrades it, breaking rate limits, or trying
            to gain access you were not given.
          </li>
          <li>Automate posting without the administrators&apos; permission.</li>
        </ul>
        <p>
          The administrators may publish additional rules for this instance. Those rules are part of
          these terms.
        </p>
      </Section>

      <Section title="Verification and affiliation">
        <p>
          A badge indicates the tier an administrator granted, or one granted through affiliation
          with a verified organisation. It is a claim by this instance, not a guarantee, and it can be
          revoked. Removing an affiliation returns the account to whatever it had earned on its own.
        </p>
        <p>
          <Link to="/CommunityNotes" className="link">
            @CommunityNotes
          </Link>{" "}
          is operated by the instance itself. It cannot be signed into, edited or suspended, so notes
          published under it cannot be quietly repurposed. See{" "}
          <Link to="/docs/verification" className="link">
            the documentation
          </Link>{" "}
          for how the tiers work.
        </p>
      </Section>

      <Section title="Moderation">
        <p>
          The administrators may remove content, or limit, suspend or delete an account that breaks
          these terms or the instance rules. Where it is reasonable to do so they should say why and
          offer a route to appeal, but this is a service run by people, not a court.
        </p>
      </Section>

      <Section title="No warranty">
        <p>
          The service is provided as-is. It may be unavailable, lose data, or shut down. Take your own
          backups of anything you cannot afford to lose. To the extent the law allows, the operators
          are not liable for indirect or consequential loss arising from your use of the instance.
        </p>
      </Section>

      <Section title="Ending it">
        <p>
          You can stop using the service and delete your account at any time. The administrators may
          end your access if you break these terms. If the instance shuts down, they should give
          notice and a window to export your data where that is practical.
        </p>
      </Section>

      <Section title="The software itself">
        <p>
          Horizon is licensed under the AGPL-3.0. That licence covers the software, not this
          instance&apos;s content or these terms, and it gives you the right to run your own copy.
        </p>
      </Section>

      <Section title="A note to whoever runs this server">
        <p>
          This is a plain-language starting point shipped with the software, not legal advice. Before
          opening registrations, add your legal identity, the governing jurisdiction, your contact
          address, your instance rules, and your appeals process — and have it reviewed if the
          instance is anything other than a hobby.
        </p>
      </Section>
    </LegalDocument>
  );
}
