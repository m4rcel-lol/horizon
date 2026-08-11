import { Link, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { ArrowLeftIcon } from "../icons";

/** Shared shell for the long-form pages: policies and documentation. */
export function LegalDocument({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated?: string;
  intro?: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div>
      <header className="x-header gap-6">
        <button type="button" onClick={() => navigate(-1)} className="icon-btn -ml-2" aria-label="Back">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <h1 className="x-title">{title}</h1>
      </header>

      <article className="px-4 py-6">
        {updated ? (
          <p className="text-[13px] mb-4" style={{ color: "var(--color-text-secondary)" }}>
            Last updated {updated}
          </p>
        ) : null}
        {intro ? <p className="text-[17px] leading-6 mb-2">{intro}</p> : null}
        {children}

        <p className="mt-10 pt-6 border-t text-[14px]" style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
          See also{" "}
          <Link to="/terms" className="link">
            Terms of Service
          </Link>
          ,{" "}
          <Link to="/privacy" className="link">
            Privacy Policy
          </Link>{" "}
          and the{" "}
          <Link to="/docs" className="link">
            documentation
          </Link>
          .
        </p>
      </article>
    </div>
  );
}

/** A titled block of prose, styled once so every document reads the same. */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8 legal-prose">
      <h2 className="text-[20px] font-extrabold tracking-tight mb-2">{title}</h2>
      {children}
    </section>
  );
}
