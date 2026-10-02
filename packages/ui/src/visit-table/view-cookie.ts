// A table's last view (docs/product/booking-plan.md, R9): its filters,
// sorting and rows per page, kept in a cookie (see ./remember-view). The
// open visit and the page number are not part of a view.

const NOT_A_VIEW = ["wizyta", "karta", "strona"];

/** The part of an address that makes a view (`zakres=dzis&sort=klient`). */
export function viewQuery(search: URLSearchParams) {
  const kept = new URLSearchParams(search);
  for (const key of NOT_A_VIEW) kept.delete(key);
  return kept.toString();
}

/** The cookie a table's last view is kept in, e.g. `ks_view_rezerwacje`. */
export function viewCookieName(table: string) {
  return `ks_view_${table}`;
}

/**
 * Where to go when the page is opened without a view: the remembered one,
 * or nowhere (none, or the defaults were last).
 */
export function rememberedView(
  path: string,
  saved: string | undefined,
): string | null {
  if (!saved || saved === "-") return null;
  const query = viewQuery(new URLSearchParams(decodeURIComponent(saved)));
  return query ? `${path}?${query}` : null;
}
