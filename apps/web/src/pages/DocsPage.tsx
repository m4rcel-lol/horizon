import type { ReactNode } from "react";
import { Link, Outlet, useParams, useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "../icons";
import { LegalDocument, Section } from "../components/LegalDocument";

interface Doc {
  slug: string;
  title: string;
  summary: string;
  body: ReactNode;
}

const DOCS: Doc[] = [
  {
    slug: "getting-started",
    title: "Getting started",
    summary: "Create an account, find people, and write your first post.",
    body: (
      <>
        <Section title="Create an account">
          <p>
            Pick a username of 3–20 characters — letters, numbers and underscores. It is how people
            mention you, and it appears in the address of your profile. Your display name is separate
            and can be anything, including nothing, in which case your username is used.
          </p>
          <p>
            Passwords must be at least 10 characters. Length matters far more than punctuation, so a
            short phrase you can remember beats a mangled word.
          </p>
        </Section>
        <Section title="Staying signed in">
          <p>
            Sign-in leaves a session on your device that survives closing the browser. Turn off
            &ldquo;stay signed in&rdquo; on a shared computer and the session ends when the browser
            does. Either way you can review and revoke your sessions from settings.
          </p>
        </Section>
        <Section title="Your first post">
          <p>
            The composer is at the top of the timeline. Posts are public: anyone can read them,
            whether or not they have an account here.
          </p>
        </Section>
        <Section title="Finding your way">
          <ul>
            <li>
              <strong>Home</strong> — For you draws from across the instance; Following is strictly
              chronological.
            </li>
            <li>
              <strong>Explore</strong> — search and trends, computed from plain activity counts.
            </li>
            <li>
              <strong>Profile</strong> — your posts, and the badge and affiliation you carry.
            </li>
          </ul>
        </Section>
      </>
    ),
  },
  {
    slug: "verification",
    title: "Verification and affiliation",
    summary: "What each badge means, and how organisations vouch for people.",
    body: (
      <>
        <Section title="The badges">
          <ul>
            <li>
              <strong>Blue</strong> — a verified individual, shown with a round avatar.
            </li>
            <li>
              <strong>Gold</strong> — a verified business, shown with a square avatar.
            </li>
            <li>
              <strong>Grey, round avatar</strong> — a person holding public office.
            </li>
            <li>
              <strong>Grey, square avatar</strong> — a government institution.
            </li>
          </ul>
          <p>
            The two government tiers share a badge and differ only in avatar shape. That is the
            signal: a ministry renders square, the minister who runs it renders round.
          </p>
        </Section>
        <Section title="Affiliation">
          <p>
            A verified business or government organisation can affiliate an account — a newsroom
            vouching for its reporters, say. The affiliated account carries a small square mark of
            the organisation next to its name, linking back to it.
          </p>
          <p>
            Affiliation is itself a verification. An unverified account becomes verified; an account
            that was already verified is raised to business, and shows a square avatar for as long as
            the affiliation lasts. Government tiers are left alone.
          </p>
          <p>
            None of this is written down permanently: the badge is worked out from the tier the
            account was granted plus its current affiliation. Remove the affiliation and the account
            returns to exactly what it had earned on its own.
          </p>
        </Section>
        <Section title="Seeing who is affiliated">
          <p>
            On an organisation&apos;s profile, the badge and the affiliate count both open its list
            of affiliated accounts, each showing the badge the affiliation grants.
          </p>
        </Section>
      </>
    ),
  },
  {
    slug: "community-notes",
    title: "Community Notes",
    summary: "How readers add context, and when a note appears on a post.",
    body: (
      <>
        <Section title="What a note is">
          <p>
            A Community Note is context a reader adds to a post — a missing detail, a correction, a
            source. Other readers then rate whether it actually helps.
          </p>
        </Section>
        <Section title="When it appears">
          <p>A note is attached to the post only once it clears a published threshold:</p>
          <ul>
            <li>Fewer than 3 ratings — pending, not shown.</li>
            <li>3 or more, with at least two thirds calling it helpful — shown on the post.</li>
            <li>3 or more, with at most a third calling it helpful — rejected, never shown.</li>
            <li>Anything in between — still pending, rather than treated as rejected.</li>
          </ul>
          <p>
            There is no model involved. Anyone reading the rating tally can work out the outcome,
            which is the point.
          </p>
        </Section>
        <Section title="Rating">
          <p>
            You get one rating per note and can change it. Re-sending the same verdict does nothing
            rather than counting twice.
          </p>
        </Section>
        <Section title="Who publishes them">
          <p>
            Notes appear under{" "}
            <Link to="/CommunityNotes" className="link">
              @CommunityNotes
            </Link>
            , an account owned by the instance. It cannot be signed into, edited or suspended — so a
            note cannot be quietly rewritten or the account repurposed by whoever runs the server.
          </p>
        </Section>
      </>
    ),
  },
  {
    slug: "accounts-and-security",
    title: "Accounts and security",
    summary: "Sessions, devices, switching accounts, and what is stored.",
    body: (
      <>
        <Section title="Sessions">
          <p>
            Signing in creates a session tied to your device. The session cookie is HttpOnly, so no
            script on the page can read it, and only a hash of the token is stored on the server — a
            database leak does not hand over live sessions.
          </p>
          <p>
            A session extends as you use it and expires after a period of inactivity. There is also a
            hard limit, after which you sign in again however active you have been.
          </p>
        </Section>
        <Section title="Devices">
          <p>
            Settings lists the devices you are signed in on, with the browser and when each was last
            used, and lets you sign out of the others.
          </p>
        </Section>
        <Section title="More than one account">
          <p>
            Accounts you have used are remembered on your device so the switcher can offer them.
            Switching asks for that account&apos;s password, because a session belongs to exactly one
            account. Signing into several at once without re-entering a password is designed but not
            yet built.
          </p>
        </Section>
        <Section title="Passwords">
          <p>
            Passwords are hashed with Argon2id and never stored or logged in the clear. Nobody
            running the server can read your password — though they can, like any server operator,
            read your content.
          </p>
        </Section>
      </>
    ),
  },
  {
    slug: "self-hosting",
    title: "Running your own instance",
    summary: "What it takes to host Horizon yourself.",
    body: (
      <>
        <Section title="What you need">
          <ul>
            <li>Docker and Docker Compose.</li>
            <li>A TLS reverse proxy — Caddy on the host, or the optional bundled container.</li>
            <li>A domain pointed at the machine.</li>
            <li>PostgreSQL and Redis, both of which Compose brings up for you.</li>
          </ul>
        </Section>
        <Section title="The shape of a deployment">
          <p>
            Compose publishes the whole site — the interface, the API and uploaded media — on one
            loopback port. The proxy in front terminates TLS and forwards to it, so nothing else needs
            to be reachable from the internet.
          </p>
          <p>
            Database migrations run before the API starts, so a fresh install builds its own schema
            with no manual step.
          </p>
        </Section>
        <Section title="Before you open registrations">
          <ul>
            <li>Set strong secrets. The defaults in the example environment are placeholders.</li>
            <li>
              Review the{" "}
              <Link to="/terms" className="link">
                Terms
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="link">
                Privacy Policy
              </Link>{" "}
              — they ship as honest starting points, not as legal advice.
            </li>
            <li>Decide your moderation rules and publish them.</li>
            <li>Take backups of the database, and check that restoring them works.</li>
          </ul>
        </Section>
        <Section title="The licence">
          <p>
            Horizon is AGPL-3.0. You may run, modify and redistribute it; if you offer a modified
            version over a network, that licence requires you to offer your changes too.
          </p>
        </Section>
      </>
    ),
  },
];

export function DocsPage() {
  return <Outlet />;
}

export function DocsIndex() {
  const navigate = useNavigate();
  return (
    <div>
      <header className="x-header gap-6">
        <button type="button" onClick={() => navigate(-1)} className="icon-btn -ml-2" aria-label="Back">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <h1 className="x-title">Documentation</h1>
      </header>

      <div className="px-4 py-4">
        <p className="text-[15px]" style={{ color: "var(--color-text-secondary)" }}>
          How this instance works — what the badges mean, how Community Notes are decided, and what
          happens to your account.
        </p>
      </div>

      <ul>
        {DOCS.map((doc) => (
          <li key={doc.slug}>
            <Link
              to={`/docs/${doc.slug}`}
              className="row-link border-b block"
              style={{ borderColor: "var(--color-border)" }}
            >
              <span className="block text-[15px] font-bold">{doc.title}</span>
              <span className="block text-[14px]" style={{ color: "var(--color-text-secondary)" }}>
                {doc.summary}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="px-4 py-4 text-[14px]" style={{ color: "var(--color-text-secondary)" }}>
        Operator and developer documentation lives in the{" "}
        <a href="https://github.com/m4rcel-lol/horizon/tree/main/docs" className="link">
          repository
        </a>
        .
      </p>
    </div>
  );
}

export function DocArticle() {
  const { slug } = useParams();
  const doc = DOCS.find((d) => d.slug === slug);

  if (!doc) {
    return (
      <div>
        <header className="x-header">
          <h1 className="x-title">Documentation</h1>
        </header>
        <div className="empty-state">
          <h2>No such page</h2>
          <p>
            That documentation page does not exist.{" "}
            <Link to="/docs" className="link">
              Back to the index
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <LegalDocument title={doc.title} intro={doc.summary}>
      {doc.body}
    </LegalDocument>
  );
}
