export type Theme = "light" | "dark";

const STORAGE_KEY = "linqo_theme";

// Inlined into a blocking <script> in __root.tsx so the class lands on <html>
// before first paint — keep that copy in sync if this logic changes.
export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem("${STORAGE_KEY}");var d=s?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

export function getCurrentTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // localStorage can throw in private-browsing/storage-restricted contexts —
    // the toggle still works for the session, it just won't persist.
  }
}
