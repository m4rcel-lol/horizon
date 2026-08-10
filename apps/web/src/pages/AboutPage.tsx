import { Link } from "react-router-dom";
import { SOFTWARE_NAME, SOFTWARE_VERSION } from "@horizon/shared";

const facts = [
  ["Registration", "Configured by administrators"],
  ["Federation", "Optional (disabled by default)"],
  ["Software", `${SOFTWARE_NAME} ${SOFTWARE_VERSION}`],
  ["Licence", "AGPL-3.0"],
];

export function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-10">
      <img src="/assets/logo.svg" alt="" className="w-12 h-12 mb-6" />

      <div className="w-full max-w-[520px]">
        <h1 className="text-[31px] font-extrabold leading-9 tracking-tight">{SOFTWARE_NAME}</h1>
        <p className="mt-1 text-[15px]" style={{ color: "var(--color-text-secondary)" }}>
          Version {SOFTWARE_VERSION}
        </p>

        <p className="mt-6 text-[17px] leading-6">
          A community-first, self-hostable social platform. No AI features, no proprietary dependencies — full control
          for instance administrators and the people using them.
        </p>

        <dl className="mt-8 rounded-2xl overflow-hidden flex flex-col gap-px">
          {facts.map(([term, value]) => (
            <div
              key={term}
              className="flex justify-between gap-4 px-4 py-3 text-[15px]"
              style={{ background: "var(--color-bg-secondary)" }}
            >
              <dt style={{ color: "var(--color-text-secondary)" }}>{term}</dt>
              <dd className="font-medium text-right">{value}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-8 text-[14px]" style={{ color: "var(--color-text-secondary)" }}>
          Instance statistics and rules are controlled by the administrator and appear here after setup.
        </p>

        <Link to="/" className="btn btn-outline btn-lg w-full mt-8">
          Back to Horizon
        </Link>
      </div>
    </div>
  );
}
