import { useCallback, useEffect, useState } from "react";

/** Explicit user preference. "system" follows the OS. */
export type ThemePreference = "light" | "dark" | "system";

/** Resolved palette actually applied to the document. */
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "horizon:theme";

export function getStoredPreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") return saved;
    // Legacy: older builds only stored "light" | "dark"
  } catch {
    // private mode
  }
  return "system";
}

export function resolveTheme(preference: ThemePreference = getStoredPreference()): ResolvedTheme {
  if (preference === "light" || preference === "dark") return preference;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", resolved === "dark" ? "#000000" : "#ffffff");
}

export function persistPreference(preference: ThemePreference) {
  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Preference will not survive reloads in private mode
  }
}

/**
 * Theme hook used by Settings → Appearance and the quick toggle.
 * Preference is light | dark | system; the document always gets a resolved theme.
 */
export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => getStoredPreference());
  const [theme, setTheme] = useState<ResolvedTheme>(() => resolveTheme());

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const pref = getStoredPreference();
      if (pref !== "system") return;
      const next = resolveTheme("system");
      setTheme(next);
      applyTheme(next);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    persistPreference(next);
    setPreferenceState(next);
    const resolved = resolveTheme(next);
    setTheme(resolved);
    applyTheme(resolved);
  }, []);

  /** Quick flip between light and dark (sets an explicit preference). */
  const toggle = useCallback(() => {
    setPreference(theme === "dark" ? "light" : "dark");
  }, [theme, setPreference]);

  return { theme, preference, setPreference, toggle };
}


const ACCENT_KEY = "horizon_accent";
const DEFAULT_ACCENT = "#1d9bf0";

export function getStoredAccent(): string {
  try {
    return localStorage.getItem(ACCENT_KEY) || DEFAULT_ACCENT;
  } catch {
    return DEFAULT_ACCENT;
  }
}

export function applyAccent(color: string) {
  const root = document.documentElement;
  root.style.setProperty("--color-primary", color);
  root.style.setProperty("--color-primary-hover", color);
  root.style.setProperty("--color-btn", color);
  try {
    localStorage.setItem(ACCENT_KEY, color);
  } catch {
    /* private mode */
  }
}

export function initAccent() {
  applyAccent(getStoredAccent());
}
