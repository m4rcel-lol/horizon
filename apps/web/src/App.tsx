import { Routes, Route } from "react-router-dom";
import { MainLayout } from "./layouts/MainLayout";
import { HomePage } from "./pages/HomePage";
import { ExplorePage } from "./pages/ExplorePage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { MessagesPage } from "./pages/MessagesPage";
import { BookmarksPage } from "./pages/BookmarksPage";
import { ProfilePage } from "./pages/ProfilePage";
import { PostPage } from "./pages/PostPage";
import { AboutPage } from "./pages/AboutPage";
import { SetupPage } from "./pages/SetupPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/bookmarks" element={<BookmarksPage />} />
        <Route path="/:username" element={<ProfilePage />} />
        <Route path="/:username/status/:postId" element={<PostPage />} />
      </Route>
    </Routes>
  );
}
