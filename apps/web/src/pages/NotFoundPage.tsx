import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "../icons";
import { SeoHead } from "../components/SeoHead";

/**
 * A page that does not exist.
 *
 * Anything not matched by a route used to render nothing at all — a white
 * screen with no header, no navigation and no indication that a URL was wrong
 * rather than the app broken.
 */
export function NotFoundPage() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="animate-fade-in">
      <SeoHead title="Page not found" description="This page does not exist on Horizon." />
      <header className="x-header gap-6">
        <button type="button" onClick={() => navigate(-1)} className="icon-btn -ml-2" aria-label="Back">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <h1 className="x-title">Not found</h1>
      </header>

      <div className="empty-state">
        <h2>This page doesn&apos;t exist</h2>
        <p className="mb-6">
          Nothing lives at <code>{location.pathname}</code>.
        </p>
        <Link to="/" className="btn btn-primary btn-lg">
          Go home
        </Link>
      </div>
    </div>
  );
}
