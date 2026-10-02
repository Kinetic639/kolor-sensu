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

const SHOWN_BY_DEFAULT = new Set<VisitColumnId>([
  "termin",
  "utworzono",
  "zmiana",
  "klient",
  "usluga",
  "specjalista",
  "status",
  "platnosc",
]);

export type ColumnLayout = { id: VisitColumnId; shown: boolean }[];

/** The columns in their usual order, the usual ones shown. */
export function defaultColumnLayout(available: readonly VisitColumnId[]) {
  return VISIT_COLUMNS.filter((id) => available.includes(id)).map((id) => ({
    id,
    shown: SHOWN_BY_DEFAULT.has(id),
  }));
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
  const fallback = defaultColumnLayout(available);
  if (!saved) return fallback;
  const seen = new Set<VisitColumnId>();
  const layout: ColumnLayout = [];
  for (const part of saved.split(",")) {
    const hidden = part.startsWith("-");
    const id = (hidden ? part.slice(1) : part) as VisitColumnId;
    if (!available.includes(id) || seen.has(id)) continue;
    seen.add(id);
    layout.push({ id, shown: !hidden });
  }
  if (!layout.length) return fallback;
  for (const column of fallback) {
    if (!seen.has(column.id)) layout.push(column);
  }
  // At least one column besides the number.
  if (!layout.some((column) => column.shown)) layout[0]!.shown = true;
  return layout;
}

export function serializeColumnLayout(layout: ColumnLayout) {
  return layout
    .map((column) => (column.shown ? column.id : `-${column.id}`))
    .join(",");
}

/** The cookie a table's layout is kept in, e.g. `ks_cols_rezerwacje`. */
export function columnsCookieName(table: string) {
  return `ks_cols_${table}`;
}

// Widths (px): each column's usual one, and the person's own, dragged at
// a header's edge and kept in a cookie of their own (the layout above keeps
// its own), so the server renders the table as wide as they left it.

export const NUMBER_COLUMN_WIDTH = 160;
export const MIN_COLUMN_WIDTH = 60;
export const MAX_COLUMN_WIDTH = 640;

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

/** A column whose width can be set: the pinned number too. */
export type WidthColumn = VisitColumnId | "numer";

export type ColumnWidths = Partial<Record<WidthColumn, number>>;

const WIDTH_COLUMNS: readonly WidthColumn[] = ["numer", ...VISIT_COLUMNS];

/** A column's usual width. */
export function usualColumnWidth(id: WidthColumn) {
  return id === "numer" ? NUMBER_COLUMN_WIDTH : VISIT_COLUMN_WIDTHS[id];
}

export function clampColumnWidth(width: number) {
  return Math.round(
    Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, width)),
  );
}

/** Saved widths (`termin:150,klient:220`); unknown or broken parts are left out. */
export function parseColumnWidths(saved: string | undefined | null) {
  const widths: ColumnWidths = {};
  for (const part of (saved ?? "").split(",")) {
    const [id, value] = part.split(":");
    const width = Number(value);
    if (
      WIDTH_COLUMNS.includes(id as WidthColumn) &&
      Number.isFinite(width) &&
      width > 0
    ) {
      widths[id as WidthColumn] = clampColumnWidth(width);
    }
  }
  return widths;
}

export function serializeColumnWidths(widths: ColumnWidths) {
  return Object.entries(widths)
    .map(([id, width]) => `${id}:${width}`)
    .join(",");
}

/** A column's width: the person's own, or the usual one. */
export function columnWidth(id: WidthColumn, widths: ColumnWidths) {
  return widths[id] ?? usualColumnWidth(id);
}

/** The cookie a table's widths are kept in, e.g. `ks_widths_rezerwacje`. */
export function widthsCookieName(table: string) {
  return `ks_widths_${table}`;
}
