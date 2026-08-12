import { Link, useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "../icons";
import { SeoHead } from "../components/SeoHead";

/**
 * What a suspended account's profile shows instead of a profile.
 *
 * Deliberately blank above the notice: no banner, no picture, no bio, no
 * counts. The server withholds all of it, so there is nothing here that could
 * leak back even if this component asked for it.
 *
 * The notice says an account is suspended and points at the rules. It does not
 * say what the account did — the reason is a moderation record shown to the
 * account itself at sign-in, and publishing it to every passer-by would turn a
 * suspension into a pillory.
 */
export function SuspendedProfile({ username }: { username: string }) {
  const navigate = useNavigate();

  return (
    <div className="animate-fade-in">
      <SeoHead
        title={`@${username} is suspended`}
        description="This account has been suspended on Horizon."
        url={`/${username}`}
      />
      <header className="x-header gap-6">
        <button type="button" onClick={() => navigate(-1)} className="icon-btn -ml-2" aria-label="Back">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="x-title truncate">@{username}</h1>
        </div>
      </header>

      {/* An empty banner and avatar keep the page recognisable as a profile
          while showing nothing the account chose about itself. */}
      <div className="h-[200px]" style={{ background: "var(--color-bg-secondary)" }} />
      <div className="px-4 pb-3">
        <div className="profile-avatar-overlap -mt-[66px]">
          <span
            className="block rounded-full border-4"
            style={{
              width: 133,
              height: 133,
              borderColor: "var(--color-bg)",
              background: "var(--color-bg-secondary)",
            }}
          />
        </div>
        <h2 className="mt-3 text-[20px] font-extrabold">@{username}</h2>
      </div>

      <div className="empty-state">
        <h2>Profile suspended</h2>
        <p>
          This user has been suspended for breaking{" "}
          <Link to="/rules" className="link">
            Horizon rules
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
