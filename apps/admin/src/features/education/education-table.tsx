import { Tag } from "@repo/ui/visit-table";
import type { Route } from "next";
import Link from "next/link";
import type { StateTag } from "./view-model";

// Edukacja's list: a compact table, a row each (title as the link to its
// page, the other columns as the list has them, the state, the last edit).

const DATE = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
  timeZone: "Europe/Warsaw",
});

export interface EducationTableRow {
  id: string;
  title: string;
  state: StateTag;
  updatedAt: string;
  cells: readonly (string | null)[];
}

export function EducationTable({
  basePath,
  caption,
  columns,
  rows,
  empty,
}: {
  basePath: "/artykuly" | "/ebooki";
  caption: string;
  /** The columns between the title and the state. */
  columns: readonly string[];
  rows: readonly EducationTableRow[];
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
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 bg-[var(--surface)]">
          <tr>
            <th className={head} scope="col">
              Tytuł
            </th>
            {columns.map((column) => (
              <th
                className={`${head} hidden md:table-cell`}
                key={column}
                scope="col"
              >
                {column}
              </th>
            ))}
            <th className={head} scope="col">
              Stan
            </th>
            <th className={`${head} hidden sm:table-cell`} scope="col">
              Zmieniony
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className="hover:bg-[var(--surface-subtle)]" key={row.id}>
              <th className={`${cell} text-left font-medium`} scope="row">
                <Link
                  className="hover:underline focus-visible:underline focus-visible:outline-none"
                  href={`${basePath}/${row.id}` as Route}
                >
                  {row.title}
                </Link>
              </th>
              {row.cells.map((value, index) => (
                <td
                  className={`${cell} hidden text-[var(--text-muted)] md:table-cell`}
                  key={columns[index]}
                >
                  {value ?? "—"}
                </td>
              ))}
              <td className={cell}>
                <Tag tone={row.state.tone}>{row.state.label}</Tag>
              </td>
              <td
                className={`${cell} hidden text-[var(--text-muted)] tabular-nums sm:table-cell`}
              >
                {DATE.format(new Date(row.updatedAt))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
