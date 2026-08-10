import { Link } from "react-router-dom";

export function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-10">
      <img src="/assets/logo.svg" alt="Horizon" className="w-10 h-10 mb-10" />

      <div className="w-full max-w-[364px]">
        <h1 className="text-[31px] font-extrabold leading-9 mb-8 tracking-tight">Sign in to Horizon</h1>

        <form className="flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
          <div className="relative">
            <label htmlFor="username" className="x-label">
              Username or email
            </label>
            <input id="username" name="username" type="text" autoComplete="username" required className="x-field" />
          </div>

          <div className="relative">
            <label htmlFor="password" className="x-label">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="x-field"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-lg w-full">
            Sign in
          </button>

          <button type="button" className="btn btn-outline btn-lg w-full">
            Forgot password?
          </button>
        </form>

        <p className="mt-10 text-[15px]" style={{ color: "var(--color-text-secondary)" }}>
          Don&apos;t have an account?{" "}
          <Link to="/register" className="link">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
