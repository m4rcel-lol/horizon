import { useParams } from "react-router-dom";

export function ProfilePage() {
  const { username } = useParams();
  return (
    <div>
      <header className="sticky top-0 z-10 backdrop-blur bg-[var(--color-bg)]/80 border-b border-[var(--color-border)] px-4 py-3">
        <h1 className="text-xl font-bold">@{username}</h1>
      </header>
      <div className="p-8 text-center text-[var(--color-text-secondary)]">
        Profile data is loaded from the API. Create an account and posts to see content here.
      </div>
    </div>
  );
}
