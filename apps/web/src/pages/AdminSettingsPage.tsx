import { useState } from "react";

/**
 * Admin → Instance settings (Storage + Email).
 * Wired to GET/PATCH /api/instance/settings when auth is available.
 * This UI is functional against the API once the operator is authenticated.
 */
export function AdminSettingsPage() {
  const [storage, setStorage] = useState({
    endpoint: "",
    region: "us-east-1",
    bucket: "horizon",
    accessKey: "",
    secretKey: "",
    forcePathStyle: true,
    publicUrl: "",
  });
  const [email, setEmail] = useState({
    enabled: false,
    host: "",
    port: 587,
    secure: false,
    user: "",
    password: "",
    from: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/instance/settings", { credentials: "include" });
      const data = await res.json();
      if (data.settings) {
        setStorage({
          endpoint: String(data.settings["storage.endpoint"] ?? ""),
          region: String(data.settings["storage.region"] ?? "us-east-1"),
          bucket: String(data.settings["storage.bucket"] ?? "horizon"),
          accessKey: "",
          secretKey: "",
          forcePathStyle: Boolean(data.settings["storage.forcePathStyle"] ?? true),
          publicUrl: String(data.settings["storage.publicUrl"] ?? ""),
        });
        setEmail({
          enabled: Boolean(data.settings["email.enabled"]),
          host: String(data.settings["email.host"] ?? ""),
          port: Number(data.settings["email.port"] ?? 587),
          secure: Boolean(data.settings["email.secure"]),
          user: String(data.settings["email.user"] ?? ""),
          password: "",
          from: String(data.settings["email.from"] ?? ""),
        });
      }
      if (data.resolved) {
        setMessage(
          `Storage: ${data.resolved.storage?.configured ? "configured" : "not configured"} (${data.resolved.storage?.source}). ` +
            `Email: ${data.resolved.email?.configured ? "configured" : "not configured"} (${data.resolved.email?.source}).`,
        );
      }
    } catch (e) {
      setMessage("Failed to load settings. Is the API running?");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setLoading(true);
    setMessage(null);
    try {
      const body: Record<string, unknown> = {
        "storage.endpoint": storage.endpoint,
        "storage.region": storage.region,
        "storage.bucket": storage.bucket,
        "storage.forcePathStyle": storage.forcePathStyle,
        "storage.publicUrl": storage.publicUrl,
        "email.enabled": email.enabled,
        "email.host": email.host,
        "email.port": email.port,
        "email.secure": email.secure,
        "email.user": email.user,
        "email.from": email.from,
      };
      // Only send secrets if the user typed new values
      if (storage.accessKey) body["storage.accessKey"] = storage.accessKey;
      if (storage.secretKey) body["storage.secretKey"] = storage.secretKey;
      if (email.password) body["email.password"] = email.password;

      const res = await fetch("/api/instance/settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) {
        setMessage(data.error.message || "Save failed");
      } else {
        setMessage("Settings saved.");
        setStorage((s) => ({ ...s, accessKey: "", secretKey: "" }));
        setEmail((e) => ({ ...e, password: "" }));
      }
    } catch {
      setMessage("Save failed.");
    } finally {
      setLoading(false);
    }
  }

  async function testStorage() {
    const res = await fetch("/api/instance/settings/test-storage", {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json();
    setMessage(data.message || data.error?.message || JSON.stringify(data));
  }

  async function testEmail() {
    const res = await fetch("/api/instance/settings/test-email", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    setMessage(data.message || data.error?.message || JSON.stringify(data));
  }

  return (
    <div className="max-w-[600px] mx-auto min-h-screen border-x" style={{ borderColor: "var(--color-border)" }}>
      <header className="x-header justify-between">
        <h1 className="x-title">Instance settings</h1>
        <div className="flex gap-2">
          <button type="button" onClick={load} disabled={loading} className="btn btn-outline">
            Load
          </button>
          <button type="button" onClick={save} disabled={loading} className="btn btn-primary">
            Save
          </button>
        </div>
      </header>

      <div className="px-4 py-4">
        <p className="text-[15px]" style={{ color: "var(--color-text-secondary)" }}>
          Object storage and SMTP can be set here or via environment variables. Environment values win when both are
          set.
        </p>
      </div>

      {message && (
        <p className="mx-4 mb-4 text-[14px] p-3 rounded-2xl card" role="status">
          {message}
        </p>
      )}

      <section className="px-4 pb-8">
        <h2 className="text-[20px] font-extrabold mb-4">Storage (S3-compatible)</h2>
        <div className="flex flex-col gap-4">
          <Field label="Endpoint URL" value={storage.endpoint} onChange={(v) => setStorage({ ...storage, endpoint: v })} />
          <Field label="Region" value={storage.region} onChange={(v) => setStorage({ ...storage, region: v })} />
          <Field label="Bucket" value={storage.bucket} onChange={(v) => setStorage({ ...storage, bucket: v })} />
          <Field label="Access key" value={storage.accessKey} onChange={(v) => setStorage({ ...storage, accessKey: v })} placeholder="Leave blank to keep current" />
          <Field label="Secret key" type="password" value={storage.secretKey} onChange={(v) => setStorage({ ...storage, secretKey: v })} placeholder="Leave blank to keep current" />
          <Field label="Public base URL" value={storage.publicUrl} onChange={(v) => setStorage({ ...storage, publicUrl: v })} />
          <label className="flex items-center gap-3 text-[15px]">
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={storage.forcePathStyle}
              onChange={(e) => setStorage({ ...storage, forcePathStyle: e.target.checked })}
            />
            Force path-style (MinIO / some S3-compatible providers)
          </label>
          <button type="button" onClick={testStorage} className="link text-[15px] self-start">
            Test storage configuration
          </button>
        </div>
      </section>

      <section className="px-4 pb-10 border-t pt-8" style={{ borderColor: "var(--color-border)" }}>
        <h2 className="text-[20px] font-extrabold mb-4">Email (SMTP)</h2>
        <div className="flex flex-col gap-4">
          <label className="flex items-center gap-3 text-[15px]">
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={email.enabled}
              onChange={(e) => setEmail({ ...email, enabled: e.target.checked })}
            />
            Enable outbound email
          </label>
          <Field label="SMTP host" value={email.host} onChange={(v) => setEmail({ ...email, host: v })} />
          <Field label="Port" value={String(email.port)} onChange={(v) => setEmail({ ...email, port: Number(v) || 587 })} />
          <label className="flex items-center gap-3 text-[15px]">
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={email.secure}
              onChange={(e) => setEmail({ ...email, secure: e.target.checked })}
            />
            Use TLS (secure)
          </label>
          <Field label="Username" value={email.user} onChange={(v) => setEmail({ ...email, user: v })} />
          <Field label="Password" type="password" value={email.password} onChange={(v) => setEmail({ ...email, password: v })} placeholder="Leave blank to keep current" />
          <Field label="From address" value={email.from} onChange={(v) => setEmail({ ...email, from: v })} placeholder='Horizon <noreply@example.com>' />
          <button type="button" onClick={testEmail} className="link text-[15px] self-start">
            Send test email
          </button>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  // Derive a stable id so the label actually points at its input.
  const id = `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="relative">
      <label htmlFor={id} className="x-label">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="x-field"
      />
    </div>
  );
}
