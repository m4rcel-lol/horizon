import { Link } from "react-router-dom";

export function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <img src="/assets/logo.svg" alt="Horizon" className="w-12 h-12 mb-8" />
      <h1 className="text-3xl font-bold mb-8">Sign in to Horizon</h1>
      <form className="w-full max-w-sm space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label htmlFor="username" className="block text-sm font-medium mb-1">
            Username or email
          </label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            required
            className="w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-3 outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-3 outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold py-3 rounded-full"
        >
          Sign in
        </button>
      </form>
      <p className="mt-6 text-sm text-[var(--color-text-secondary)]">
        Don&apos;t have an account?{" "}
        <Link to="/register" className="text-[var(--color-primary)] hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
