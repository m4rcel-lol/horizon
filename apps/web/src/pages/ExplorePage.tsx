import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { SearchIcon } from "../icons";
import { api } from "../api";
import { PostCard } from "../components/PostCard";
import { ComposerModal, type ComposerTarget } from "../components/ComposerModal";
import { Avatar, NameWithBadges } from "../components/Verification";
import { TimelineSkeleton } from "../components/LoadingSpinner";

const tabs = [
  { id: "top", label: "Top" },
  { id: "people", label: "People" },
  { id: "posts", label: "Posts" },
] as const;

/**
 * Search.
 *
 * The query lives in the URL, so a search is a link: it can be shared, opened
 * in a new tab, and survives a refresh.
 */
export function ExplorePage() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const [draft, setDraft] = useState(query);
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("top");
  const [composing, setComposing] = useState<ComposerTarget>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["search", query],
    queryFn: () => api.search(query),
    enabled: query.trim().length > 0,
  });

  const users = data?.users ?? [];
  const posts = data?.posts ?? [];
  const nothing = query.trim().length > 0 && !isLoading && users.length === 0 && posts.length === 0;

  return (
    <div>
      <header className="x-header">
        <form
          className="flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            setParams(draft.trim() ? { q: draft.trim() } : {});
          }}
        >
          <label className="sr-only" htmlFor="search-input">
            Search Horizon
          </label>
          <div className="relative">
            <SearchIcon
              className="w-[18px] h-[18px] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "var(--color-text-secondary)" }}
            />
            <input
              id="search-input"
              type="search"
              placeholder="Search Horizon"
              className="x-search !pl-10 w-full"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          </div>
        </form>
      </header>

      {query ? (
        <div className="x-tabs sticky top-[53px] z-10" role="tablist" aria-label="Search results">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className="x-tab"
            >
              {t.label}
            </button>
          ))}
        </div>
      ) : null}

      {!query ? (
        <div className="empty-state">
          <h2>Search Horizon</h2>
          <p>
            Find accounts by name or handle, and posts by what they say. Matching is plain and
            literal — there is no ranking model deciding what you get to see.
          </p>
        </div>
      ) : isLoading ? (
        <TimelineSkeleton rows={3} />
      ) : nothing ? (
        <div className="empty-state">
          <h2>No results for “{query}”</h2>
          <p>Try a different spelling, or a shorter word.</p>
        </div>
      ) : (
        <>
          {tab !== "posts" && users.length > 0 ? (
            <section aria-label="People">
              {tab === "top" ? (
                <h2
                  className="px-4 py-3 text-[20px] font-extrabold border-b"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  People
                </h2>
              ) : null}
              <ul>
                {users.map((u) => (
                  <li key={u.id}>
                    <div
                      className="flex gap-3 px-4 py-3 border-b transition-colors hover:bg-[var(--color-row-hover)]"
                      style={{ borderColor: "var(--color-border)" }}
                    >
                      <Link to={`/${u.username}`} className="shrink-0">
                        <Avatar
                          shape={u.avatarShape}
                          size={44}
                          src={u.avatarUrl || "/assets/default-avatar.svg"}
                        />
                      </Link>
                      <div className="min-w-0">
                        <span className="block font-bold text-[15px]">
                          <NameWithBadges
                            displayName={u.displayName}
                            verification={u.effectiveVerification}
                            affiliatedTo={u.affiliatedTo}
                            nameHref={`/${u.username}`}
                            badgeClassName="w-[16px] h-[16px]"
                          />
                        </span>
                        <Link
                          to={`/${u.username}`}
                          className="block text-[15px] hover:underline"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          @{u.username}
                        </Link>
                        {u.bio ? <p className="mt-1 text-[15px]">{u.bio}</p> : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {tab !== "people" && posts.length > 0 ? (
            <section aria-label="Posts">
              {tab === "top" ? (
                <h2
                  className="px-4 py-3 text-[20px] font-extrabold border-b"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  Posts
                </h2>
              ) : null}
              <ul>
                {posts.map((post) => (
                  <li key={post.id}>
                    <PostCard
                      post={post}
                      onReply={(p) => setComposing({ mode: "reply", post: p })}
                      onQuote={(p) => setComposing({ mode: "quote", post: p })}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {tab === "people" && users.length === 0 ? (
            <div className="empty-state">
              <h2>No accounts match “{query}”</h2>
            </div>
          ) : null}
          {tab === "posts" && posts.length === 0 ? (
            <div className="empty-state">
              <h2>No posts match “{query}”</h2>
            </div>
          ) : null}
        </>
      )}

      <ComposerModal target={composing} onClose={() => setComposing(null)} />
    </div>
  );
}
