import {
  defaultLayout,
  parseLayout,
  type ColumnLayout,
  type ColumnSet,
} from "../data-table/columns";
import type { ClientSortColumn } from "./params";

// The clients list's columns (docs/product/booking-plan.md, R15): the
// portals' table columns (../data-table) with a client a row. The name
// stays pinned first; the rest the person arranges ("Kolumny").

export const CLIENT_COLUMNS = [
  "email",
  "telefon",
  "wizyty",
  "nadchodzace",
  "ostatnia",
  "najblizsza",
  "zaplacono",
  "dodany",
  "notatka",
] as const;

export type ClientColumnId = (typeof CLIENT_COLUMNS)[number];

export const CLIENT_COLUMN_SET: ColumnSet<ClientColumnId> = {
  ids: CLIENT_COLUMNS,
  labels: {
    email: "E-mail",
    telefon: "Telefon",
    wizyty: "Wizyty",
    nadchodzace: "Nadchodzące",
    ostatnia: "Ostatnia wizyta",
    najblizsza: "Następna wizyta",
    zaplacono: "Zapłacono",
    dodany: "Klient od",
    notatka: "Notatka",
  },
  widths: {
    email: 240,
    telefon: 140,
    wizyty: 90,
    nadchodzace: 140,
    ostatnia: 140,
    najblizsza: 190,
    zaplacono: 120,
    dodany: 120,
    notatka: 260,
  },
  shownByDefault: [
    "email",
    "telefon",
    "wizyty",
    "ostatnia",
    "najblizsza",
    "zaplacono",
  ],
  pinned: { id: "klient", label: "Nazwisko i imię", width: 220 },
};

/** The column a header sorts by (none: not sortable). */
export const CLIENT_COLUMN_SORT: Partial<
  Record<ClientColumnId, ClientSortColumn>
> = {
  wizyty: "wizyty",
  ostatnia: "ostatnia",
  najblizsza: "najblizsza",
  zaplacono: "zaplacono",
  dodany: "dodany",
};

export type ClientColumnLayout = ColumnLayout<ClientColumnId>;

export function defaultClientLayout() {
  return defaultLayout(CLIENT_COLUMN_SET);
}

/** A saved layout, as the bookings' (see ../data-table/columns). */
export function parseClientLayout(saved: string | undefined | null) {
  return parseLayout(CLIENT_COLUMN_SET, saved);
}
