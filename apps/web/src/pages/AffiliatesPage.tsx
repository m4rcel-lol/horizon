import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon } from "../icons";
import { api, ApiError } from "../api";
import { Avatar, NameWithBadges, VerifiedBadge } from "../components/Verification";

/** The accounts a verified organisation has affiliated. */
export function AffiliatesPage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const handle = username ?? "";

  const organisation = useQuery({
    queryKey: ["user", handle],
    queryFn: () => api.getUser(handle),
    retry: false,
    enabled: Boolean(handle),
  });

  const affiliates = useQuery({
    queryKey: ["affiliates", handle],
    queryFn: () => api.affiliates(handle),
    retry: false,
    enabled: Boolean(handle),
  });

  const org = organisation.data?.user;
  const list = affiliates.data?.affiliates ?? [];
  const missing = organisation.error instanceof ApiError && organisation.error.status === 404;

  return (
    <div>
      <header className="x-header gap-6">
        <button type="button" onClick={() => navigate(-1)} className="icon-btn -ml-2" aria-label="Back">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="x-title truncate">Affiliates</h1>
          <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
            @{handle}
          </p>
        </div>
      </header>

      {org ? (
        <div
          className="flex items-center gap-3 px-4 py-3 border-b"
          style={{ borderColor: "var(--color-border)" }}
        >
          <Avatar shape={org.avatarShape} size={40} />
          <div className="min-w-0">
            <Link to={`/${org.username}`} className="font-bold hover:underline">
              <NameWithBadges displayName={org.displayName} verification={org.effectiveVerification} />
            </Link>
            <p className="text-[13px] flex items-center gap-1.5" style={{ color: "var(--color-text-secondary)" }}>
              <VerifiedBadge type={org.effectiveVerification} className="w-3.5 h-3.5" />
              {org.verificationLabel}
            </p>
          </div>
        </div>
      ) : null}

      {organisation.isLoading || affiliates.isLoading ? (
        <p className="px-4 py-6 text-[15px]" style={{ color: "var(--color-text-secondary)" }}>
          Loading affiliates…
        </p>
      ) : missing ? (
        <div className="empty-state">
          <h2>This account doesn&apos;t exist</h2>
          <p>Try searching for another.</p>
        </div>
      ) : list.length === 0 ? (
        <div className="empty-state">
          <h2>No affiliated accounts</h2>
          <p>
            {org?.canAffiliate
              ? `@${handle} has not affiliated anyone yet. Affiliated accounts appear here with the badge the affiliation grants them.`
              : `@${handle} is not a verified business or government organisation, so it cannot affiliate accounts.`}
          </p>
        </div>
      ) : (
        <ul>
          {list.map((user) => (
            <li key={user.id}>
              <Link
                to={`/${user.username}`}
                className="row-link flex gap-3 border-b"
                style={{ borderColor: "var(--color-border)" }}
              >
                <Avatar shape={user.avatarShape} size={48} />
                <div className="min-w-0 flex-1">
                  <span className="font-bold">
                    <NameWithBadges
                      displayName={user.displayName}
                      verification={user.effectiveVerification}
                      affiliatedTo={user.affiliatedTo}
                    />
                  </span>
                  <p className="text-[15px]" style={{ color: "var(--color-text-secondary)" }}>
                    @{user.username}
                  </p>
                  {user.bio ? <p className="text-[15px] mt-0.5">{user.bio}</p> : null}
                  <p
                    className="text-[13px] mt-1 flex items-center gap-1.5"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    <VerifiedBadge type={user.effectiveVerification} className="w-3.5 h-3.5" />
                    {user.verificationLabel}
                    {user.verification !== user.effectiveVerification ? " through this affiliation" : null}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
