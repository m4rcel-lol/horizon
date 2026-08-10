import { Routes, Route } from "react-router-dom";
import { MainLayout } from "./layouts/MainLayout";
import { HomePage } from "./pages/HomePage";
import { ExplorePage } from "./pages/ExplorePage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { MessagesPage } from "./pages/MessagesPage";
import { BookmarksPage } from "./pages/BookmarksPage";
import { ListsPage } from "./pages/ListsPage";
import { CommunitiesPage } from "./pages/CommunitiesPage";
import { ProfilePage } from "./pages/ProfilePage";
import { PostPage } from "./pages/PostPage";
import { AboutPage } from "./pages/AboutPage";
import { SetupPage } from "./pages/SetupPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { AdminSettingsPage } from "./pages/AdminSettingsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/admin/settings" element={<AdminSettingsPage />} />
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/bookmarks" element={<BookmarksPage />} />
        {/* These were linked from the nav but had no route, so they fell
            through to /:username and rendered as profiles. */}
        <Route path="/lists" element={<ListsPage />} />
        <Route path="/communities" element={<CommunitiesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/:username" element={<ProfilePage />} />
        <Route path="/:username/status/:postId" element={<PostPage />} />
      </Route>
    </Routes>
  );
}
