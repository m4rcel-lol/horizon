import { Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./layouts/MainLayout";
import { useSession } from "./hooks/useSession";
import { PageLoader } from "./components/LoadingSpinner";
import { LandingPage } from "./pages/LandingPage";
import { HomePage } from "./pages/HomePage";
import { ExplorePage } from "./pages/ExplorePage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { MessagesPage } from "./pages/MessagesPage";
import { BookmarksPage } from "./pages/BookmarksPage";
import { ListsPage } from "./pages/ListsPage";
import { CommunitiesPage } from "./pages/CommunitiesPage";
import { ProfilePage } from "./pages/ProfilePage";
import { AffiliatesPage } from "./pages/AffiliatesPage";
import { CommunityNotesPage } from "./pages/CommunityNotesPage";
import { PostPage } from "./pages/PostPage";
import { AboutPage } from "./pages/AboutPage";
import { SetupPage } from "./pages/SetupPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { AdminSettingsPage } from "./pages/AdminSettingsPage";
import { AdminVerificationPage } from "./pages/AdminVerificationPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { TermsPage } from "./pages/TermsPage";
import { DocsPage, DocsIndex, DocArticle } from "./pages/DocsPage";
import {
  SettingsPage,
  SettingsAppearancePage,
  SettingsAccountPage,
  SettingsPrivacyPage,
} from "./pages/SettingsPage";

/**
 * The root is the landing page for visitors, and the timeline for members.
 * Docs / legal pages render standalone (no app chrome).
 */
function RootRoute() {
  const { active, loading } = useSession();
  if (loading) return <PageLoader label="Loading…" />;
  return active ? <Navigate to="/home" replace /> : <LandingPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/admin/settings" element={<AdminSettingsPage />} />
      <Route path="/admin/verification" element={<AdminVerificationPage />} />

      {/* Standalone legal / documentation pages — no main nav chrome */}
      <Route path="/about" element={<AboutPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/docs" element={<DocsPage />}>
        <Route index element={<DocsIndex />} />
        <Route path=":slug" element={<DocArticle />} />
      </Route>

      <Route path="/" element={<RootRoute />} />

      <Route element={<MainLayout />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/bookmarks" element={<BookmarksPage />} />
        <Route path="/notes" element={<CommunityNotesPage />} />
        <Route path="/lists" element={<ListsPage />} />
        <Route path="/communities" element={<CommunitiesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />}>
          <Route path="appearance" element={<SettingsAppearancePage />} />
          <Route path="account" element={<SettingsAccountPage />} />
          <Route path="privacy" element={<SettingsPrivacyPage />} />
        </Route>
        <Route path="/:username/affiliates" element={<AffiliatesPage />} />
        <Route path="/:username" element={<ProfilePage />} />
        <Route path="/:username/status/:postId" element={<PostPage />} />
      </Route>
    </Routes>
  );
}
