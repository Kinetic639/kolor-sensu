import { formatMinor } from "@repo/contracts/discount-codes";
import type { AdminWorkshopRow } from "@repo/supabase/workshops-admin";
import { Tag } from "@repo/ui/visit-table";
import type { Route } from "next";
import Link from "next/link";
import { seatsLabel, whenLabel } from "./view-model";

// Warsztaty's list: a compact table, a row each (the title as the link to
// its page, when, who leads, where, the seats taken of all and what waits,
// the money paid, the state).

const STATES = {
  draft: { label: "Szkic", tone: "neutral" },
  published: { label: "Opublikowany", tone: "success" },
  cancelled: { label: "Odwołany", tone: "warning" },
  completed: { label: "Zakończony", tone: "neutral" },
} as const;

export function WorkshopTable({
  rows,
  timeZone,
  empty,
}: {
  rows: readonly AdminWorkshopRow[];
  timeZone: string;
  empty: string;
}) {
  if (rows.length === 0)
    return (
      <p className="px-3.5 py-6 text-sm text-[var(--text-muted)]">{empty}</p>
    );
  const head =
    "h-8 border-b border-[var(--border)] px-3 text-left text-[0.75rem] font-medium text-[var(--text-muted)]";
  const cell = "h-[30px] border-b border-[var(--border)] px-3 text-[0.8125rem]";
  return (
    <div className="min-h-0 flex-1 overflow-auto bg-[var(--surface)]">
      <table className="w-full border-collapse">
        <caption className="sr-only">Warsztaty</caption>
        <thead className="sticky top-0 bg-[var(--surface)]">
          <tr>
            <th className={head} scope="col">
              Tytuł
            </th>
            <th className={head} scope="col">
              Termin
            </th>
            <th className={`${head} hidden lg:table-cell`} scope="col">
              Prowadzi
            </th>
            <th className={`${head} hidden md:table-cell`} scope="col">
              Miejsce
            </th>
            <th className={head} scope="col">
              Zapisani
            </th>
            <th className={`${head} hidden sm:table-cell`} scope="col">
              Wpłaty
            </th>
            <th className={head} scope="col">
              Stan
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const seats = seatsLabel(row);
            const state = STATES[row.status];
            return (
              <tr className="hover:bg-[var(--surface-subtle)]" key={row.id}>
                <th className={`${cell} text-left font-medium`} scope="row">
                  <Link
                    className="hover:underline focus-visible:underline focus-visible:outline-none"
                    href={`/warsztaty/${row.id}` as Route}
                  >
                    {row.title}
                  </Link>
                </th>
                <td className={`${cell} whitespace-nowrap tabular-nums`}>
                  {whenLabel(row.startsAt, row.endsAt, timeZone)}
                </td>
                <td
                  className={`${cell} hidden text-[var(--text-muted)] lg:table-cell`}
                >
                  {row.leaders ?? "—"}
                </td>
                <td
                  className={`${cell} hidden text-[var(--text-muted)] md:table-cell`}
                >
                  {row.modality === "online"
                    ? "Online"
                    : [row.locationName, row.roomName]
                        .filter(Boolean)
                        .join(", ") || "—"}
                </td>
                <td className={`${cell} tabular-nums`}>
                  {seats.seats}
                  {seats.waiting ? (
                    <span className="ml-2 text-[var(--text-muted)]">
                      {seats.waiting}
                    </span>
                  ) : null}
                </td>
                <td className={`${cell} hidden tabular-nums sm:table-cell`}>
                  {row.paidMinor ? formatMinor(row.paidMinor) : "—"}
                </td>
                <td className={cell}>
                  <span className="flex flex-wrap gap-1">
                    <Tag tone={state.tone}>{state.label}</Tag>
                    {row.status === "published" && row.minParticipants ? (
                      <Tag tone={row.confirmed ? "success" : "info"}>
                        {row.confirmed ? "Potwierdzony" : "Czeka na komplet"}
                      </Tag>
                    ) : null}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
