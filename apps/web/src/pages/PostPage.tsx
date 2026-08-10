import { useParams } from "react-router-dom";

export function PostPage() {
  const { username, postId } = useParams();
  return (
    <div>
      <header className="sticky top-0 z-10 backdrop-blur bg-[var(--color-bg)]/80 border-b border-[var(--color-border)] px-4 py-3">
        <h1 className="text-xl font-bold">Post</h1>
      </header>
      <div className="p-8 text-center text-[var(--color-text-secondary)]">
        Post @{username}/{postId} will be loaded from the API.
      </div>
    </div>
  );
}
