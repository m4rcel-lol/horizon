import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ApiError } from "../api";
import { useSession } from "../hooks/useSession";

export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { signIn } = useSession();
  // The account switcher links here with the handle it wants signed in.
  const [identifier, setIdentifier] = useState(params.get("u") ?? "");
  const [password, setPassword] = useState("");
  const [staySignedIn, setStaySignedIn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(identifier.trim(), password, staySignedIn);
      navigate("/home", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign in. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-10">
      <Link to="/" aria-label="Horizon">
        <img src="/assets/logo.svg" alt="Horizon" className="w-10 h-10 mb-10" />
      </Link>

      <div className="w-full max-w-[364px]">
        <h1 className="text-[31px] font-extrabold leading-9 mb-8 tracking-tight">Sign in to Horizon</h1>

        <form className="flex flex-col gap-6" onSubmit={onSubmit}>
          <div className="relative">
            <label htmlFor="identifier" className="x-label">
              Username or email
            </label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="x-field"
            />
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            Keeps you signed in after closing the browser. Turn it off on a shared computer and the
            session ends when you close it. Passwords are never stored on the device.
          </p>

          {error ? (
            <p
              role="alert"
              className="text-[14px] rounded-2xl p-3"
              style={{ background: "var(--color-bg-secondary)", color: "var(--color-danger)" }}
            >
              {error}
            </p>
          ) : null}

          <button type="submit" className="btn btn-primary btn-lg w-full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
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
