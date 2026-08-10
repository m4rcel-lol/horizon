import type { VerificationType } from "@horizon/shared";

export interface AffiliationSummary {
  id: string;
  username: string;
  displayName: string;
  verification: VerificationType;
  avatarShape: "circle" | "square";
  badge: string | null;
}

export interface ApiUser {
  id: string;
  username: string;
  displayName: string;
  bio?: string;
  /** Tier granted directly, before affiliation is taken into account. */
  verification: VerificationType;
  /** Badge actually displayed. */
  effectiveVerification: VerificationType;
  badge: string | null;
  avatarShape: "circle" | "square";
  verificationLabel: string;
  canAffiliate: boolean;
  affiliatedTo: AffiliationSummary | null;
  affiliatedAt: string | null;
  affiliateCount: number;
  createdAt: string;
}

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) {
    throw new ApiError(
      data?.error?.code ?? "REQUEST_FAILED",
      data?.error?.message ?? `Request failed (${res.status})`,
      res.status,
    );
  }
  return data as T;
}

export const api = {
  listUsers: () => request<{ users: ApiUser[] }>("/users"),
  getUser: (username: string) => request<{ user: ApiUser }>(`/users/${encodeURIComponent(username)}`),
  createUser: (body: { username: string; displayName: string; bio?: string; verification?: VerificationType }) =>
    request<{ user: ApiUser }>("/users", { method: "POST", body: JSON.stringify(body) }),
  setVerification: (username: string, type: VerificationType, reason?: string) =>
    request<{ user: ApiUser; releasedAffiliates: number }>(
      `/users/${encodeURIComponent(username)}/verification`,
      { method: "PATCH", body: JSON.stringify({ type, reason }) },
    ),
  affiliates: (username: string) =>
    request<{ affiliates: ApiUser[] }>(`/users/${encodeURIComponent(username)}/affiliates`),
  affiliate: (organisation: string, username: string) =>
    request<{ user: ApiUser; organisation: ApiUser }>(
      `/users/${encodeURIComponent(organisation)}/affiliates`,
      { method: "POST", body: JSON.stringify({ username }) },
    ),
  removeAffiliation: (username: string) =>
    request<{ user: ApiUser }>(`/users/${encodeURIComponent(username)}/affiliation`, { method: "DELETE" }),
};
