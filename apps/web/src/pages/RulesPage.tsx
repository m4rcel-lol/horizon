import { Link, useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "../icons";
import { SeoHead } from "../components/SeoHead";

/**
 * Horizon Rules.
 *
 * The page a suspension notice points at, so it has to answer the question
 * someone arrives with: what gets an account suspended here, and what can be
 * done about it. Static content — the rules of an instance are something an
 * operator writes, not something to fabricate a data model for.
 */
const ENTRIES = [
  {
    title: "What gets an account suspended",
    date: "Ongoing",
    body: [
      "Accounts are suspended for impersonation, targeted harassment, spam, and posting content that is illegal where this instance is operated.",
      "A suspension can be temporary or open-ended. Either way the account stops being able to sign in, its posts leave every timeline, and its profile shows only that it is suspended.",
      "The reason is recorded when the suspension is applied and is shown to the account itself when it next tries to sign in. It is not published on the profile: a suspension notice is not a place to publish an accusation to everyone who happens to visit.",
    ],
  },
  {
    title: "Appealing a suspension",
    date: "Ongoing",
    body: [
      "Sign in with the suspended account to see the reason and, for a temporary suspension, the date it lifts.",
      "A temporary suspension lifts itself — there is nothing to do but wait. An open-ended one is lifted by an administrator.",
    ],
  },
  {
    title: "How Community Notes decide what is shown",
    date: "Ongoing",
    body: [
      "Anyone can write a note on a post, but a note is not visible on the post until enough readers have rated it helpful — the threshold is set by the instance and is the same for everyone.",
      "Until then a note only appears on the post's own page, where it can be rated.",
    ],
  },
];

export function RulesPage() {
  const navigate = useNavigate();

  return (
    <div className="animate-fade-in">
      <SeoHead
        title="Horizon Rules"
        description="The rules of this instance, and what happens when an account breaks them."
        url="/rules"
      />
      <header className="x-header gap-6">
        <button type="button" onClick={() => navigate(-1)} className="icon-btn -ml-2" aria-label="Back">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <h1 className="x-title">Horizon Rules</h1>
      </header>

      <div className="px-4 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
        <p className="text-[15px]" style={{ color: "var(--color-text-secondary)" }}>
          The rules an account is expected to keep to on this instance, and what happens when one
          does not.
        </p>
      </div>

      <ul>
        {ENTRIES.map((entry) => (
          <li
            key={entry.title}
            className="px-4 py-5 border-b"
            style={{ borderColor: "var(--color-border)" }}
          >
            <p className="text-[13px] mb-1" style={{ color: "var(--color-text-secondary)" }}>
              {entry.date}
            </p>
            <h2 className="text-[20px] font-extrabold mb-2">{entry.title}</h2>
            {entry.body.map((paragraph) => (
              <p key={paragraph} className="text-[15px] leading-6 mb-2">
                {paragraph}
              </p>
            ))}
          </li>
        ))}
      </ul>

      <p className="px-4 py-5 text-[14px]" style={{ color: "var(--color-text-secondary)" }}>
        More about how this instance works is in the{" "}
        <Link to="/docs" className="link">
          documentation
        </Link>
        .
      </p>
    </div>
  );
}
