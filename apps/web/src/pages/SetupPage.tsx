export function SetupPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 max-w-lg mx-auto">
      <img src="/assets/logo.svg" alt="Horizon" className="w-12 h-12 mb-6" />
      <h1 className="text-2xl font-bold mb-2">Instance Setup</h1>
      <p className="text-[var(--color-text-secondary)] mb-8 text-center">
        First-run configuration. This page is only available until setup is completed by an administrator.
      </p>
      <div className="w-full space-y-4 text-sm">
        <p>The setup wizard will guide you through:</p>
        <ul className="list-disc pl-5 space-y-1 text-[var(--color-text-secondary)]">
          <li>Instance name, description, and branding</li>
          <li>Administrator account creation</li>
          <li>Registration and email settings</li>
          <li>Storage and media limits</li>
          <li>Basic moderation and privacy defaults</li>
        </ul>
        <p className="pt-4 text-[var(--color-text-secondary)]">
          Full setup form is implemented in the API + admin flow. After completion this route is disabled.
        </p>
      </div>
    </div>
  );
}
