const steps = [
  { title: "Instance identity", detail: "Name, description and branding for this server." },
  { title: "Administrator account", detail: "Create the first owner account and secure it." },
  { title: "Registration & email", detail: "Who can join, and how outbound mail is delivered." },
  { title: "Storage & media", detail: "Object storage target and per-upload limits." },
  { title: "Moderation & privacy", detail: "Default rules, visibility and reporting behaviour." },
];

export function SetupPage() {
  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-10">
      <img src="/assets/logo.svg" alt="Horizon" className="w-10 h-10 mb-8" />

      <div className="w-full max-w-[520px]">
        <h1 className="text-[31px] font-extrabold leading-9 tracking-tight">Set up your instance</h1>
        <p className="mt-3 text-[15px]" style={{ color: "var(--color-text-secondary)" }}>
          First-run configuration. This page stays available until an administrator completes setup.
        </p>

        <ol className="mt-8 flex flex-col gap-px overflow-hidden rounded-2xl">
          {steps.map((step, i) => (
            <li key={step.title} className="flex gap-4 px-4 py-4" style={{ background: "var(--color-bg-secondary)" }}>
              <span
                className="shrink-0 w-7 h-7 rounded-full grid place-items-center text-[13px] font-bold"
                style={{ background: "var(--color-btn)", color: "var(--color-btn-text)" }}
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <div>
                <p className="font-bold text-[15px]">{step.title}</p>
                <p className="text-[14px]" style={{ color: "var(--color-text-secondary)" }}>
                  {step.detail}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <button type="button" className="btn btn-primary btn-lg w-full mt-8">
          Begin setup
        </button>

        <p className="mt-4 text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
          Once setup completes this route is locked until an administrator re-enables it.
        </p>
      </div>
    </div>
  );
}
