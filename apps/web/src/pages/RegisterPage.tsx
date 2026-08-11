import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../api";
import { useSession } from "../hooks/useSession";

export function RegisterPage() {
  const navigate = useNavigate();
  const { signUp } = useSession();
  const [form, setForm] = useState({ displayName: "", username: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: event.target.value }));

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signUp({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        displayName: form.displayName.trim() || undefined,
      });
      navigate("/home", { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not create the account. Check the details and try again.",
      );
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
        <h1 className="text-[31px] font-extrabold leading-9 mb-8 tracking-tight">Create your account</h1>

        <form className="flex flex-col gap-6" onSubmit={onSubmit}>
          <div className="relative">
            <label htmlFor="displayName" className="x-label">
              Name (optional)
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              autoComplete="name"
              maxLength={50}
              value={form.displayName}
              onChange={set("displayName")}
              className="x-field"
            />
          </div>

          <div className="relative">
            <label htmlFor="username" className="x-label">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              minLength={3}
              maxLength={20}
              pattern="[a-zA-Z0-9_]+"
              title="Letters, numbers and underscores only"
              value={form.username}
              onChange={set("username")}
              className="x-field"
            />
          </div>

          <div className="relative">
            <label htmlFor="email" className="x-label">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={set("email")}
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
              autoComplete="new-password"
              required
              minLength={10}
              value={form.password}
              onChange={set("password")}
              className="x-field"
            />
            <p className="mt-1 text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
              At least 10 characters. Longer beats complicated.
            </p>
          </div>

          {error ? (
            <p
              role="alert"
              className="text-[14px] rounded-2xl p-3"
              style={{ background: "var(--color-bg-secondary)", color: "var(--color-danger)" }}
            >
              {error}
            </p>
          ) : null}

          <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
            By signing up you agree to the{" "}
            <Link to="/terms" className="link">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="link">
              Privacy Policy
            </Link>
            , and to the rules set by this instance&apos;s administrators.
          </p>

          <button type="submit" className="btn btn-primary btn-lg w-full" disabled={busy}>
            {busy ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-10 text-[15px]" style={{ color: "var(--color-text-secondary)" }}>
          Already have an account?{" "}
          <Link to="/login" className="link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
