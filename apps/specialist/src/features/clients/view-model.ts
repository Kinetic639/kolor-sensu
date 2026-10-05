import type { MyClient } from "@repo/supabase";

// Moi klienci: the specialist's clients as the list shows them, with
// their visits in words and the next and last in the centre's time.

export interface MyClientRow {
  id: string;
  name: string;
  href: string;
  contact: string;
  visits: string;
  /** `12.10, 10:00`, or null. */
  next: string | null;
  /** `28.09.2026`, or null. */
  last: string | null;
  /** What the list's filter matches, in lower case. */
  search: string;
}

export function visitsInWords(count: number) {
  if (count === 1) return "1 wizyta";
  const few =
    count % 10 >= 2 &&
    count % 10 <= 4 &&
    (count % 100 < 12 || count % 100 > 14);
  return `${count} ${few ? "wizyty" : "wizyt"}`;
}

export function myClientRows(
  clients: MyClient[],
  timeZone: string,
): MyClientRow[] {
  const next = new Intl.DateTimeFormat("pl-PL", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const day = new Intl.DateTimeFormat("pl-PL", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return clients.map((client) => ({
    id: client.id,
    name: client.name,
    href: `/klienci/${client.id}`,
    contact: [client.email, client.phone].filter(Boolean).join(" · "),
    visits: visitsInWords(client.visits),
    next: client.nextVisitAt ? next.format(new Date(client.nextVisitAt)) : null,
    last: client.lastVisitAt ? day.format(new Date(client.lastVisitAt)) : null,
    search: [client.name, client.email, client.phone]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  }));
}
