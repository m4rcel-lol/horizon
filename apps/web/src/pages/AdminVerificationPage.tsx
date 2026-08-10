import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { VERIFICATION_TYPES, verificationPresentation, type VerificationType } from "@horizon/shared";
import { api, ApiError, type ApiUser } from "../api";
import { Avatar, NameWithBadges, VerifiedBadge } from "../components/Verification";

export function AdminVerificationPage() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [affiliateTarget, setAffiliateTarget] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({ queryKey: ["users"], queryFn: api.listUsers });
  const users = data?.users ?? [];
  const organisations = users.filter((u) => u.canAffiliate);

  const refresh = () => queryClient.invalidateQueries();
  const report = (text: string) => setMessage(text);
  const fail = (error: unknown) =>
    setMessage(error instanceof ApiError ? error.message : "Something went wrong.");

  const setVerification = useMutation({
    mutationFn: ({ username, type }: { username: string; type: VerificationType }) =>
      api.setVerification(username, type),
    onSuccess: (result) => {
      const released = result.releasedAffiliates
        ? ` ${result.releasedAffiliates} affiliation${result.releasedAffiliates === 1 ? "" : "s"} released.`
        : "";
      report(`@${result.user.username} is now ${verificationPresentation(result.user.effectiveVerification).label.toLowerCase()}.${released}`);
      refresh();
    },
    onError: fail,
  });

  const affiliate = useMutation({
    mutationFn: ({ organisation, username }: { organisation: string; username: string }) =>
      api.affiliate(organisation, username),
    onSuccess: (result) => {
      report(
        `@${result.user.username} is affiliated with @${result.organisation.username} and now shows ${verificationPresentation(result.user.effectiveVerification).label.toLowerCase()}.`,
      );
      refresh();
    },
    onError: fail,
  });

  const removeAffiliation = useMutation({
    mutationFn: (username: string) => api.removeAffiliation(username),
    onSuccess: (result) => {
      report(`Affiliation removed from @${result.user.username}.`);
      refresh();
    },
    onError: fail,
  });

  return (
    <div className="max-w-[600px] mx-auto min-h-screen border-x" style={{ borderColor: "var(--color-border)" }}>
      <header className="x-header">
        <h1 className="x-title">Verification</h1>
      </header>

      <div className="px-4 py-4">
        <p className="text-[15px]" style={{ color: "var(--color-text-secondary)" }}>
          Grant a tier, or let an organisation affiliate an account. Affiliation verifies the account it is
          applied to: an unverified account becomes verified, and an already-verified one is raised to business.
        </p>
      </div>

      {message ? (
        <p className="mx-4 mb-4 text-[14px] p-3 rounded-2xl card" role="status">
          {message}
        </p>
      ) : null}

      {isLoading ? (
        <p className="px-4 pb-8 text-[15px]" style={{ color: "var(--color-text-secondary)" }}>
          Loading accounts…
        </p>
      ) : users.length === 0 ? (
        <div className="empty-state">
          <h2>No accounts yet</h2>
          <p>Accounts created on this instance appear here, with their verification tier and affiliations.</p>
        </div>
      ) : (
        <ul>
          {users.map((user) => (
            <li key={user.id} className="px-4 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
              <AccountRow
                user={user}
                organisations={organisations}
                busy={setVerification.isPending || affiliate.isPending || removeAffiliation.isPending}
                affiliateTarget={affiliateTarget[user.username] ?? ""}
                onAffiliateTargetChange={(value) =>
                  setAffiliateTarget((prev) => ({ ...prev, [user.username]: value }))
                }
                onSetVerification={(type) => setVerification.mutate({ username: user.username, type })}
                onAffiliate={(organisation) => affiliate.mutate({ organisation, username: user.username })}
                onRemoveAffiliation={() => removeAffiliation.mutate(user.username)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AccountRow({
  user,
  organisations,
  busy,
  affiliateTarget,
  onAffiliateTargetChange,
  onSetVerification,
  onAffiliate,
  onRemoveAffiliation,
}: {
  user: ApiUser;
  organisations: ApiUser[];
  busy: boolean;
  affiliateTarget: string;
  onAffiliateTargetChange: (value: string) => void;
  onSetVerification: (type: VerificationType) => void;
  onAffiliate: (organisation: string) => void;
  onRemoveAffiliation: () => void;
}) {
  const selectId = `verification-${user.username}`;
  const orgId = `affiliate-${user.username}`;
  const available = organisations.filter((o) => o.username !== user.username);

  return (
    <div className="flex gap-3">
      <Avatar shape={user.avatarShape} size={48} />

      <div className="flex-1 min-w-0">
        <Link to={`/${user.username}`} className="font-bold hover:underline">
          <NameWithBadges
            displayName={user.displayName}
            verification={user.effectiveVerification}
            affiliatedTo={user.affiliatedTo}
          />
        </Link>
        <p className="text-[14px]" style={{ color: "var(--color-text-secondary)" }}>
          @{user.username}
        </p>

        <p className="mt-1 text-[13px] flex items-center gap-1.5" style={{ color: "var(--color-text-secondary)" }}>
          <VerifiedBadge type={user.effectiveVerification} className="w-3.5 h-3.5" />
          {verificationPresentation(user.effectiveVerification).label}
          {user.verification !== user.effectiveVerification ? ` (granted: ${user.verification})` : null}
          {` · ${user.avatarShape} avatar`}
        </p>

        {user.affiliatedTo ? (
          <p className="mt-1 text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
            Affiliated with @{user.affiliatedTo.username}
          </p>
        ) : null}
        {user.affiliateCount > 0 ? (
          <p className="mt-1 text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
            {user.affiliateCount} affiliated {user.affiliateCount === 1 ? "account" : "accounts"}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="relative">
            <label htmlFor={selectId} className="x-label">
              Tier
            </label>
            <select
              id={selectId}
              className="x-field pr-8"
              value={user.verification}
              disabled={busy}
              onChange={(e) => onSetVerification(e.target.value as VerificationType)}
            >
              {VERIFICATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {verificationPresentation(type).label}
                </option>
              ))}
            </select>
          </div>

          {user.affiliatedTo ? (
            <button type="button" className="btn btn-outline" disabled={busy} onClick={onRemoveAffiliation}>
              Remove affiliation
            </button>
          ) : available.length > 0 ? (
            <>
              <div className="relative">
                <label htmlFor={orgId} className="x-label">
                  Affiliate with
                </label>
                <select
                  id={orgId}
                  className="x-field pr-8"
                  value={affiliateTarget}
                  disabled={busy}
                  onChange={(e) => onAffiliateTargetChange(e.target.value)}
                >
                  <option value="">Choose an organisation…</option>
                  {available.map((org) => (
                    <option key={org.id} value={org.username}>
                      @{org.username}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy || !affiliateTarget}
                onClick={() => affiliateTarget && onAffiliate(affiliateTarget)}
              >
                Affiliate
              </button>
            </>
          ) : (
            <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
              No verified organisation available to affiliate this account.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
