import {
  createLoader,
  createSerializer,
  parseAsStringLiteral,
} from "nuqs/server";

// Ustawienia: the section (tab) lives in the URL, so each renders on the
// server, loads only what it shows and has an address.

export const SETTINGS_TABS = [
  "centrum",
  "lokalizacje",
  "rezerwacje",
  "zamkniecia",
] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number];

const LABELS: Record<SettingsTab, string> = {
  centrum: "Centrum",
  lokalizacje: "Lokalizacje",
  rezerwacje: "Rezerwacje online",
  zamkniecia: "Dni zamknięcia",
};

const settingsParsers = {
  zakladka: parseAsStringLiteral(SETTINGS_TABS).withDefault("centrum"),
};

export const loadSettingsParams = createLoader(settingsParsers);

const serialize = createSerializer(settingsParsers, { clearOnDefault: true });

export function settingsHref(zakladka: SettingsTab) {
  return serialize("/ustawienia", { zakladka });
}

/** The page's tabs, as links (`count`: e.g. the locations). */
export function settingsTabs(
  counts: Partial<Record<SettingsTab, number>> = {},
) {
  return SETTINGS_TABS.map((key) => ({
    key,
    label: LABELS[key],
    href: settingsHref(key),
    count: counts[key],
  }));
}
