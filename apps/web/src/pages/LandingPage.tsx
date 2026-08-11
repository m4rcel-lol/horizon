import { Link } from "react-router-dom";

const points = [
  {
    title: "No algorithm deciding for you",
    body: "The following feed is strictly chronological. The discovery feed ranks on plain, published signals an administrator controls — never on a model built from your behaviour.",
  },
  {
    title: "Context from readers, not moderators",
    body: "Community Notes let readers add context to a post. A note only appears once enough other readers agree it helps, on a published threshold anyone can check.",
  },
  {
    title: "Verification that means something",
    body: "Individuals, businesses and government accounts carry distinct badges, and organisations can vouch for the people who work for them.",
  },
  {
    title: "Yours to run",
    body: "AGPL-3.0, self-hostable, no proprietary services, and no AI features anywhere in the stack.",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 w-full max-w-[1100px] mx-auto px-6 py-10 grid gap-14 lg:grid-cols-2 lg:items-center lg:py-20">
        {/* Mark */}
        <div className="flex justify-center lg:justify-start">
          <img src="/assets/logo.svg" alt="" className="w-32 h-32 lg:w-[380px] lg:h-[380px]" />
        </div>

        {/* Pitch */}
        <div>
          <h1 className="text-[40px] lg:text-[64px] font-extrabold leading-[1.05] tracking-tight">
            Happening now
          </h1>
          <p className="mt-8 text-[24px] lg:text-[31px] font-extrabold leading-tight">Join today.</p>

          <div className="mt-6 flex flex-col gap-3 max-w-[300px]">
            <Link to="/register" className="btn btn-primary btn-lg w-full">
              Create account
            </Link>
            <p className="text-[11px] leading-4" style={{ color: "var(--color-text-secondary)" }}>
              By signing up you agree to the{" "}
              <Link to="/terms" className="link">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="link">
                Privacy Policy
              </Link>
              .
            </p>
          </div>

          <div className="mt-10 max-w-[300px]">
            <p className="text-[17px] font-bold mb-3">Already have an account?</p>
            <Link to="/login" className="btn btn-outline btn-lg w-full">
              Sign in
            </Link>
          </div>
        </div>
      </main>

      {/* What this is */}
      <section className="w-full border-t" style={{ borderColor: "var(--color-border)" }}>
        <div className="max-w-[1100px] mx-auto px-6 py-14">
          <h2 className="text-[28px] font-extrabold tracking-tight">What makes this different</h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            {points.map((point) => (
              <div key={point.title}>
                <h3 className="text-[17px] font-bold">{point.title}</h3>
                <p className="mt-1 text-[15px] leading-6" style={{ color: "var(--color-text-secondary)" }}>
                  {point.body}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-10 text-[15px]" style={{ color: "var(--color-text-secondary)" }}>
            You can read the instance without an account —{" "}
            <Link to="/explore" className="link">
              browse what people are posting
            </Link>{" "}
            or read the{" "}
            <Link to="/docs" className="link">
              documentation
            </Link>
            .
          </p>
        </div>
      </section>

      <footer className="w-full border-t" style={{ borderColor: "var(--color-border)" }}>
        <nav
          className="max-w-[1100px] mx-auto px-6 py-6 flex flex-wrap gap-x-5 gap-y-2 text-[13px]"
          style={{ color: "var(--color-text-secondary)" }}
          aria-label="Footer"
        >
          <Link to="/about" className="hover:underline">
            About
          </Link>
          <Link to="/docs" className="hover:underline">
            Documentation
          </Link>
          <Link to="/terms" className="hover:underline">
            Terms of Service
          </Link>
          <Link to="/privacy" className="hover:underline">
            Privacy Policy
          </Link>
          <Link to="/notes" className="hover:underline">
            Community Notes
          </Link>
          <a href="https://github.com/m4rcel-lol/horizon" className="hover:underline">
            Source
          </a>
          <span>AGPL-3.0</span>
        </nav>
      </footer>
    </div>
  );
}
