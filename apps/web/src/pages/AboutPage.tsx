import { SOFTWARE_NAME, SOFTWARE_VERSION } from "@horizon/shared";

export function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 max-w-2xl mx-auto">
      <img src="/assets/logo.svg" alt="" className="w-16 h-16 mb-4" />
      <h1 className="text-3xl font-bold mb-2">{SOFTWARE_NAME}</h1>
      <p className="text-[var(--color-text-secondary)] mb-6">Version {SOFTWARE_VERSION}</p>
      <p className="text-center mb-8">
        A community-first, self-hostable social platform. No AI features. Full control for instance administrators and users.
      </p>
      <div className="w-full bg-[var(--color-bg-secondary)] rounded-2xl p-6 text-sm space-y-2">
        <p><strong>Registration:</strong> Configured by administrators</p>
        <p><strong>Federation:</strong> Optional (disabled by default)</p>
        <p><strong>Software:</strong> {SOFTWARE_NAME} {SOFTWARE_VERSION}</p>
      </div>
      <p className="mt-8 text-sm text-[var(--color-text-secondary)]">
        Statistics and rules are controlled by the instance administrator and appear here after setup.
      </p>
    </div>
  );
}
