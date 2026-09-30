"use client";

import { debounce, useQueryStates } from "nuqs";
import { LoaderCircle, Search } from "lucide-react";
import { useTransition } from "react";
import { parseAsSearch, visitTableParsers } from "./params";

// The bookings table's search box: the only part of the table that runs in
// the browser. It updates the address as the user types (the server page
// renders the results), once they pause; a new search starts at page 1.

export function VisitTableSearch({
  placeholder = "Szukaj: klient, numer, usługa…",
}: {
  placeholder?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [{ q }, setParams] = useQueryStates(
    { q: parseAsSearch, strona: visitTableParsers.strona },
    { shallow: false, startTransition, clearOnDefault: true },
  );
  return (
    <label className="relative block w-full sm:w-64">
      <span className="sr-only">Szukaj rezerwacji</span>
      {pending ? (
        <LoaderCircle
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 animate-spin text-[var(--text-muted)]"
        />
      ) : (
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-[var(--text-muted)]"
        />
      )}
      <input
        className="h-8 w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] pr-2.5 pl-8 text-[0.8125rem] text-[var(--text)] placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
        maxLength={100}
        onChange={(event) =>
          setParams(
            { q: event.target.value || null, strona: null },
            // Clearing the box shows everything at once.
            {
              limitUrlUpdates: event.target.value ? debounce(300) : undefined,
            },
          )
        }
        placeholder={placeholder}
        type="search"
        value={q ?? ""}
      />
    </label>
  );
}
