import {
  loadVisitTableParams,
  visitTableHref,
  type VisitTableParams,
} from "./params";

// The bookings table's ready views (docs/product/booking-plan.md, R9): a set
// of filters a click away, named in the bar ("Nadchodzące ▾"). A view
// replaces the filters and the search; any other set is "Własny widok".

export interface VisitView {
  id: string;
  label: string;
  filters: Partial<VisitTableParams>;
  /** Only where payments are shown (admins). */
  payments?: boolean;
}

const NO_FILTERS = {
  q: null,
  status: null,
  platnosc: null,
  specjalista: null,
  usluga: null,
  miejsce: null,
  zakres: "nadchodzace",
  od: null,
  do: null,
} as const satisfies Partial<VisitTableParams>;

export const VISIT_VIEWS: VisitView[] = [
  { id: "nadchodzace", label: "Nadchodzące", filters: {} },
  { id: "dzis", label: "Dziś", filters: { zakres: "dzis" } },
  { id: "jutro", label: "Jutro", filters: { zakres: "jutro" } },
  {
    id: "ten-tydzien",
    label: "Ten tydzień",
    filters: { zakres: "ten-tydzien" },
  },
  {
    id: "oczekujace",
    label: "Czeka na płatność",
    filters: { status: ["oczekujace"] },
  },
  {
    id: "do-rozliczenia",
    label: "Do rozliczenia",
    filters: { zakres: "wszystkie", platnosc: "do-zwrotu" },
    payments: true,
  },
  {
    id: "odwolane",
    label: "Odwołane",
    filters: { zakres: "wszystkie", status: ["odwolane"] },
  },
  { id: "minione", label: "Minione", filters: { zakres: "minione" } },
  { id: "wszystkie", label: "Wszystkie", filters: { zakres: "wszystkie" } },
];

export function visitViews(showPayments: boolean) {
  return VISIT_VIEWS.filter((view) => showPayments || !view.payments);
}

/** The filters a view sets (everything else cleared). */
export function viewFilters(view: VisitView): Partial<VisitTableParams> {
  return { ...NO_FILTERS, ...view.filters };
}

const same = (a: unknown, b: unknown) =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** The view the address shows, or null ("Własny widok"). */
export function currentView(
  params: VisitTableParams,
  showPayments: boolean,
): VisitView | null {
  return (
    visitViews(showPayments).find((view) =>
      Object.entries(viewFilters(view)).every(([key, value]) =>
        same(params[key as keyof VisitTableParams], value),
      ),
    ) ?? null
  );
}

/** The table showing a view: its filters, page 1, the panel closed. */
export function viewHref(
  path: string,
  params: VisitTableParams,
  view: VisitView,
) {
  return visitTableHref(path, params, {
    ...viewFilters(view),
    strona: 1,
    wizyta: null,
  });
}

/** A view's own params, as if opened fresh (for counting its visits). */
export function viewParams(view: VisitView): VisitTableParams {
  return { ...loadVisitTableParams({}), ...viewFilters(view) };
}
