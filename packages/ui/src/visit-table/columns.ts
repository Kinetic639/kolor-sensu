import type { VisitSortColumn } from "./params";

// The bookings table's columns (docs/product/booking-plan.md, R9): which
// there are, the order and which are shown. The person arranges them (the
// "Kolumny" menu); the layout lives in a cookie, so the server renders the
// table as they left it. The reference number stays first and the menu
// last; they are not in the layout.

export const VISIT_COLUMNS = [
  "termin",
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
};

const SHOWN_BY_DEFAULT = new Set<VisitColumnId>([
  "termin",
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
