import { createParser } from "nuqs/server";

// Which rows of a roster are open, and on which tab: `?otwarte=<id>:<tab>,<id>`
// (no tab: the first). Kept in the address so a refresh or a shared link
// opens them again; the server renders them open.

/** Open rows by id; null: on the first tab. */
export type OpenRows = Record<string, string | null>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TAB = /^[a-z-]{1,24}$/;

export const parseAsOpenRows = createParser<OpenRows>({
  parse: (value) => {
    const rows: OpenRows = {};
    for (const part of value.split(",")) {
      const [id, tab] = part.split(":");
      if (!id || !UUID.test(id)) continue;
      rows[id] = tab && TAB.test(tab) ? tab : null;
    }
    return Object.keys(rows).length ? rows : null;
  },
  serialize: (rows) =>
    Object.entries(rows)
      .map(([id, tab]) => (tab ? `${id}:${tab}` : id))
      .join(","),
  eq: (a, b) => JSON.stringify(a) === JSON.stringify(b),
});

/** The row's tab: null the first, undefined when closed. */
export function openTab(rows: OpenRows | null, id: string) {
  return rows && id in rows ? rows[id] : undefined;
}

/** The rows with one opened or closed (none left: null). */
export function withRow(
  rows: OpenRows | null,
  id: string,
  open: boolean,
): OpenRows | null {
  const next = { ...rows };
  if (open) next[id] = next[id] ?? null;
  else delete next[id];
  return Object.keys(next).length ? next : null;
}

/** The rows with one on a tab (opening it). */
export function withTab(
  rows: OpenRows | null,
  id: string,
  tab: string | null,
): OpenRows {
  return { ...rows, [id]: tab };
}
