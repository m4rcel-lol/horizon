/**
 * Multi-account session vault (client-side).
 *
 * Design goals:
 * - Stay logged in across browser restarts (refresh tokens / long-lived session cookies
 *   coordinated with the API; this module holds the account roster the UI needs).
 * - Switch between several accounts on the same device without re-typing passwords.
 * - Never store plaintext passwords. Only opaque session tokens issued by the server.
 *
 * Server contract (to be fully wired with AuthModule):
 * - POST /api/auth/login → { session: { token, expiresAt }, user }
 * - POST /api/auth/refresh → rotate token
 * - POST /api/auth/logout → revoke current session
 * - POST /api/auth/logout-all → revoke all sessions for the user
 * - Cookies: HttpOnly, Secure, SameSite=Lax session cookie preferred for the *active*
 *   account; additional accounts keep refresh tokens in this vault only when the user
 *   opts into "Stay signed in on this device".
 *
 * Security notes:
 * - Tokens in localStorage are XSS-sensitive; keep a tight CSP and sanitize HTML.
 * - Prefer storing only refresh tokens here; access tokens stay in memory.
 * - When AuthModule ships cookie sessions, active account uses cookies; the vault
 *   still tracks which other accounts can be switched to (refresh tokens or
 *   one-time switch codes exchanged server-side).
 */

export type StoredAccount = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  /** Opaque refresh or session token — never a password. */
  token: string;
  expiresAt: string; // ISO
  lastUsedAt: string; // ISO
};

const VAULT_KEY = "horizon:account-vault";
const ACTIVE_KEY = "horizon:active-account-id";

function readVault(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredAccount[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((a) => a && a.userId && a.token);
  } catch {
    return [];
  }
}

function writeVault(accounts: StoredAccount[]) {
  try {
    localStorage.setItem(VAULT_KEY, JSON.stringify(accounts));
  } catch {
    // Quota / private mode
  }
}

export function listAccounts(): StoredAccount[] {
  return readVault().sort(
    (a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime(),
  );
}

export function getActiveAccountId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function getActiveAccount(): StoredAccount | null {
  const id = getActiveAccountId();
  if (!id) return null;
  return readVault().find((a) => a.userId === id) ?? null;
}

/** Upsert an account after successful login / refresh. */
export function saveAccount(account: StoredAccount, makeActive = true) {
  const vault = readVault().filter((a) => a.userId !== account.userId);
  vault.push({ ...account, lastUsedAt: new Date().toISOString() });
  writeVault(vault);
  if (makeActive) {
    try {
      localStorage.setItem(ACTIVE_KEY, account.userId);
    } catch {
      /* ignore */
    }
  }
}

export function setActiveAccount(userId: string): StoredAccount | null {
  const account = readVault().find((a) => a.userId === userId);
  if (!account) return null;
  try {
    localStorage.setItem(ACTIVE_KEY, userId);
  } catch {
    /* ignore */
  }
  // Bump last used
  saveAccount({ ...account, lastUsedAt: new Date().toISOString() }, true);
  return account;
}

export function removeAccount(userId: string) {
  const vault = readVault().filter((a) => a.userId !== userId);
  writeVault(vault);
  if (getActiveAccountId() === userId) {
    try {
      localStorage.removeItem(ACTIVE_KEY);
      if (vault[0]) localStorage.setItem(ACTIVE_KEY, vault[0].userId);
    } catch {
      /* ignore */
    }
  }
}

export function clearAllAccounts() {
  try {
    localStorage.removeItem(VAULT_KEY);
    localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* ignore */
  }
}

/** True when token is still within expiry (with 60s skew). */
export function isAccountSessionValid(account: StoredAccount): boolean {
  const exp = new Date(account.expiresAt).getTime();
  if (!Number.isFinite(exp)) return false;
  return exp > Date.now() + 60_000;
}
