import {
  defaultLayout,
  parseLayout,
  parseWidths,
  usualWidth,
  widthOf,
  type ColumnLayout as Layout,
  type ColumnSet,
  type ColumnWidths,
} from "../data-table/columns";
import type { VisitSortColumn } from "./params";

// The bookings table's columns (docs/product/booking-plan.md, R9): which
// there are, the order and which are shown. The person arranges them (the
// "Kolumny" menu); the layout lives in a cookie, so the server renders the
// table as they left it. The reference number stays first and the menu
// last; they are not in the layout.

export const VISIT_COLUMNS = [
  "termin",
  "utworzono",
  "zmiana",
  "klient",
  "telefon",
  "email",
  "usluga",
  "miejsce",
  "specjalista",
  "status",
  "platnosc",
  "uwagi",
] as const;

export type VisitColumnId = (typeof VISIT_COLUMNS)[number];

export const VISIT_COLUMN_LABELS: Record<VisitColumnId, string> = {
  termin: "Termin",
  klient: "Klient",
  telefon: "Telefon",
  email: "E-mail",
  usluga: "Usługa",
  miejsce: "Miejsce",
  specjalista: "Specjalista",
  status: "Status",
  platnosc: "Płatność",
  uwagi: "Uwagi",
  utworzono: "Utworzono",
  zmiana: "Zmiana",
};

/** The column a header sorts by (none: not sortable). */
export const VISIT_COLUMN_SORT: Partial<
  Record<VisitColumnId, VisitSortColumn>
> = {
  termin: "termin",
  klient: "klient",
  usluga: "usluga",
  miejsce: "miejsce",
  specjalista: "specjalista",
  status: "status",
  platnosc: "kwota",
  utworzono: "utworzono",
  zmiana: "zmiana",
};

export const NUMBER_COLUMN_WIDTH = 160;
export { MAX_COLUMN_WIDTH, MIN_COLUMN_WIDTH } from "../data-table/columns";

export const VISIT_COLUMN_WIDTHS: Record<VisitColumnId, number> = {
  termin: 140,
  klient: 190,
  telefon: 130,
  email: 220,
  usluga: 210,
  miejsce: 160,
  specjalista: 200,
  status: 190,
  platnosc: 170,
  uwagi: 220,
  utworzono: 150,
  zmiana: 150,
};

/** The bookings table's columns, as every table of the portals has them. */
export const VISIT_COLUMN_SET: ColumnSet<VisitColumnId> = {
  ids: VISIT_COLUMNS,
  labels: VISIT_COLUMN_LABELS,
  widths: VISIT_COLUMN_WIDTHS,
  shownByDefault: [
    "termin",
    "utworzono",
    "zmiana",
    "klient",
    "usluga",
    "specjalista",
    "status",
    "platnosc",
  ],
  pinned: { id: "numer", label: "Numer", width: NUMBER_COLUMN_WIDTH },
};

export type ColumnLayout = Layout<VisitColumnId>;

/** The columns in their usual order, the usual ones shown. */
export function defaultColumnLayout(available: readonly VisitColumnId[]) {
  return defaultLayout(VISIT_COLUMN_SET, available);
}

/**
 * A saved layout (`termin,klient,-telefon,…`: the order, `-` for hidden),
 * kept to the columns this table has; any the save does not know come
 * after, as they would by default. Nonsense gives the default.
 */
export function parseColumnLayout(
  saved: string | undefined | null,
  available: readonly VisitColumnId[],
): ColumnLayout {
  return parseLayout(VISIT_COLUMN_SET, saved, available);
}

export { serializeLayout as serializeColumnLayout } from "../data-table/columns";
export {
  clampColumnWidth,
  columnsCookieName,
  serializeWidths as serializeColumnWidths,
  widthsCookieName,
  type ColumnWidths,
} from "../data-table/columns";

/** A column whose width can be set: the pinned number too. */
export type WidthColumn = VisitColumnId | "numer";

/** A column's usual width. */
export function usualColumnWidth(id: WidthColumn) {
  return usualWidth(VISIT_COLUMN_SET, id);
}

/** Saved widths (`termin:150,klient:220`); unknown or broken parts are left out. */
export function parseColumnWidths(saved: string | undefined | null) {
  return parseWidths(saved, VISIT_COLUMN_SET);
}

/** A column's width: the person's own, or the usual one. */
export function columnWidth(id: WidthColumn, widths: ColumnWidths) {
  return widthOf(VISIT_COLUMN_SET, id, widths);
}
