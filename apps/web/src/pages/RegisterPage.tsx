import { Link } from "react-router-dom";

const fields = [
  { id: "displayName", label: "Name", type: "text", autoComplete: "name" },
  { id: "username", label: "Username", type: "text", autoComplete: "username" },
  { id: "email", label: "Email", type: "email", autoComplete: "email" },
  { id: "password", label: "Password", type: "password", autoComplete: "new-password" },
];

export function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-10">
      <img src="/assets/logo.svg" alt="Horizon" className="w-10 h-10 mb-10" />

      <div className="w-full max-w-[364px]">
        <h1 className="text-[31px] font-extrabold leading-9 mb-8 tracking-tight">Create your account</h1>

        <form className="flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
          {fields.map((f) => (
            <div className="relative" key={f.id}>
              <label htmlFor={f.id} className="x-label">
                {f.label}
              </label>
              <input
                id={f.id}
                name={f.id}
                type={f.type}
                autoComplete={f.autoComplete}
                required
                className="x-field"
              />
            </div>
          ))}

          <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
            By signing up you agree to the rules set by this instance&apos;s administrators.
          </p>

          <button type="submit" className="btn btn-primary btn-lg w-full">
            Create account
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
