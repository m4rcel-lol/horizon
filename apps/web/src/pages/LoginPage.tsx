import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSession } from "../hooks/useSession";

export function LoginPage() {
  const navigate = useNavigate();
  const { loginLocal } = useSession();
  const [staySignedIn, setStaySignedIn] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const username = String(fd.get("username") || "").trim();
    const password = String(fd.get("password") || "");

    if (!username || !password) {
      setError("Enter username and password.");
      return;
    }

    // Until AuthModule is fully wired, persist a local session so multi-account
    // switching and "stay signed in" work end-to-end in the UI.
    // Replace this block with POST /api/auth/login when the server is ready.
    if (staySignedIn) {
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `local-${Date.now()}`;
      loginLocal({
        userId: id,
        username: username.replace(/^@/, "").split("@")[0],
        displayName: username.replace(/^@/, "").split("@")[0],
        avatarUrl: null,
        token: `pending-${id}`,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        lastUsedAt: new Date().toISOString(),
      });
    }

    navigate("/");
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-10">
      <img src="/assets/logo.svg" alt="Horizon" className="w-10 h-10 mb-10" />

      <div className="w-full max-w-[364px]">
        <h1 className="text-[31px] font-extrabold leading-9 mb-8 tracking-tight">Sign in to Horizon</h1>

        <form className="flex flex-col gap-6" onSubmit={onSubmit}>
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

          <label className="flex items-center gap-2 text-[15px] cursor-pointer">
            <input
              type="checkbox"
              checked={staySignedIn}
              onChange={(e) => setStaySignedIn(e.target.checked)}
              className="accent-[var(--color-primary)]"
            />
            Stay signed in on this device
          </label>
          <p className="text-[13px] -mt-4" style={{ color: "var(--color-text-secondary)" }}>
            Saves this account so you can switch profiles and stay logged in after closing the
            browser. Passwords are never stored.
          </p>

          {error ? (
            <p className="text-[14px] text-red-500" role="alert">
              {error}
            </p>
          ) : null}

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
