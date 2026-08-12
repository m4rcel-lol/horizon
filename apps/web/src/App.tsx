import { Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./layouts/MainLayout";
import { useSession } from "./hooks/useSession";
import { PageLoader } from "./components/LoadingSpinner";
import { LandingPage } from "./pages/LandingPage";
import { HomePage } from "./pages/HomePage";
import { ExplorePage } from "./pages/ExplorePage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { MessagesPage, ConversationPage } from "./pages/MessagesPage";
import { BookmarksPage } from "./pages/BookmarksPage";
import { ListsPage } from "./pages/ListsPage";
import { CommunitiesPage } from "./pages/CommunitiesPage";
import { CommunityPage } from "./pages/CommunityPage";
import { CommunityJoinRequestsPage } from "./pages/CommunityJoinRequestsPage";
import { HashtagPage } from "./pages/HashtagPage";
import { ProfilePage } from "./pages/ProfilePage";
import { AffiliatesPage } from "./pages/AffiliatesPage";
import { FollowListPage } from "./pages/FollowListPage";
import { CommunityNotesPage } from "./pages/CommunityNotesPage";
import { PostPage } from "./pages/PostPage";
import { AboutPage } from "./pages/AboutPage";
import { SetupPage } from "./pages/SetupPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { AdminSettingsPage } from "./pages/AdminSettingsPage";
import { AdminVerificationPage } from "./pages/AdminVerificationPage";
import { RequirePermission } from "./components/RequirePermission";
import { AdminLayout } from "./layouts/AdminLayout";
import { AdminOverviewPage } from "./pages/AdminOverviewPage";
import { AdminUsersPage } from "./pages/AdminUsersPage";
import { MaintenanceScreen } from "./components/MaintenanceScreen";
import { AdminStatisticsPage } from "./pages/AdminStatisticsPage";
import { AdminNotesPage } from "./pages/AdminNotesPage";
import { UserStatsPage } from "./pages/UserStatsPage";
import { PERMISSIONS } from "@horizon/shared";
import { PrivacyPage } from "./pages/PrivacyPage";
import { TermsPage } from "./pages/TermsPage";
import { DocsPage, DocsIndex, DocArticle } from "./pages/DocsPage";
import {
  SettingsPage,
  SettingsAppearancePage,
  SettingsAccountPage,
  SettingsPrivacyPage,
  SettingsAutomationPage,
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
    <>
      <MaintenanceScreen />
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/setup" element={<SetupPage />} />
      {/* Every admin page shares one frame, so they are navigable between and
          have a way out. Each still checks its own permission. */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route
          index
          element={
            <RequirePermission permission={PERMISSIONS.USERS_VIEW}>
              <AdminOverviewPage />
            </RequirePermission>
          }
        />
        <Route
          path="users"
          element={
            <RequirePermission permission={PERMISSIONS.USERS_VIEW}>
              <AdminUsersPage />
            </RequirePermission>
          }
        />
        <Route
          path="statistics"
          element={
            <RequirePermission permission={PERMISSIONS.USERS_VIEW}>
              <AdminStatisticsPage />
            </RequirePermission>
          }
        />
        <Route
          path="notes"
          element={
            <RequirePermission permission={PERMISSIONS.MODERATION_MANAGE}>
              <AdminNotesPage />
            </RequirePermission>
          }
        />
        <Route
          path="settings"
          element={
            <RequirePermission permission={PERMISSIONS.SETTINGS_VIEW}>
              <AdminSettingsPage />
            </RequirePermission>
          }
        />
        <Route
          path="verification"
          element={
            <RequirePermission permission={PERMISSIONS.VERIFICATION_GRANT}>
              <AdminVerificationPage />
            </RequirePermission>
          }
        />
      </Route>

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
        <Route path="/c/:slug" element={<CommunityPage />} />
        <Route path="/hashtag/:tag" element={<HashtagPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />}>
          <Route path="appearance" element={<SettingsAppearancePage />} />
          <Route path="account" element={<SettingsAccountPage />} />
          <Route path="privacy" element={<SettingsPrivacyPage />} />
          <Route path="automation" element={<SettingsAutomationPage />} />
        </Route>
        <Route path="/messages/:id" element={<ConversationPage />} />
        <Route path="/communities/:slug" element={<CommunityPage />} />
        <Route path="/communities/:slug/requests" element={<CommunityJoinRequestsPage />} />
        <Route path="/:username/affiliates" element={<AffiliatesPage />} />
        <Route path="/:username/stats" element={<UserStatsPage />} />
        <Route path="/:username/followers" element={<FollowListPage mode="followers" />} />
        <Route path="/:username/following" element={<FollowListPage mode="following" />} />
        <Route path="/:username" element={<ProfilePage />} />
        <Route path="/:username/status/:postId" element={<PostPage />} />
      </Route>
    </Routes>
    </>
  );
}
