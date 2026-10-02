// The portals' colour theme: light, dark, or the device's setting. Kept in
// a cookie, so the server renders <html data-theme> right away (no flash of
// the other theme); the colours themselves are in tokens.css.

export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_COOKIE = "ks_theme";

export const THEME_LABELS: Record<Theme, string> = {
  light: "Jasny",
  dark: "Ciemny",
  system: "Systemowy",
};

/** The saved theme; the device's setting when none (or not a theme). */
export function parseTheme(value: string | undefined): Theme {
  return THEMES.find((theme) => theme === value) ?? "system";
}

/** Switches the page and remembers the choice for a year (in the browser). */
export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
}
