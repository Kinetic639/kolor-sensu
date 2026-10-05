"use client";

import { Input } from "@repo/ui/input";
import { Users } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import type { MyClientRow } from "./view-model";

// Moi klienci: the specialist's clients, the next visit first, filtered as
// one types (a specialist has a handful); each opens its card with the
// visits with them.

export function MyClients({ rows }: { rows: MyClientRow[] }) {
  const [query, setQuery] = useState("");
  const words = query.trim().toLowerCase();
  const shown = words ? rows.filter((row) => row.search.includes(words)) : rows;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-11 shrink-0 flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3">
        <Input
          aria-label="Szukaj klienta"
          className="h-8 max-w-xs text-[0.8125rem]"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Szukaj po imieniu, e-mailu, telefonie"
          type="search"
          value={query}
        />
        <span className="ml-auto text-[0.8125rem] text-[var(--text-muted)]">
          {words
            ? `${shown.length} z ${rows.length}`
            : `Klienci: ${rows.length}`}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--surface)]">
        {shown.length ? (
          <ul aria-label="Moi klienci">
            {shown.map((row) => (
              <li key={row.id}>
                <Link
                  className="grid gap-x-4 gap-y-0.5 border-b border-[color-mix(in_srgb,var(--border)_60%,transparent)] px-3.5 py-2 hover:bg-[var(--surface-muted)] focus-visible:bg-[var(--surface-muted)] focus-visible:outline-none sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_6rem_8rem_7rem] sm:items-center"
                  href={row.href as Route}
                >
                  <span className="truncate text-[0.8125rem] font-medium text-[var(--text)]">
                    {row.name}
                  </span>
                  <span className="truncate text-[0.75rem] text-[var(--text-muted)]">
                    {row.contact}
                  </span>
                  <span className="text-[0.75rem] text-[var(--text-muted)] tabular-nums">
                    {row.visits}
                  </span>
                  <span className="text-[0.75rem] tabular-nums">
                    {row.next ? (
                      <span className="text-[var(--text)]">
                        najbliższa {row.next}
                      </span>
                    ) : (
                      <span className="text-[var(--text-subtle)]">
                        bez najbliższej
                      </span>
                    )}
                  </span>
                  <span className="text-[0.75rem] text-[var(--text-muted)] tabular-nums">
                    {row.last ? `ostatnia ${row.last}` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid justify-items-center gap-2 px-4 py-12 text-center">
            <Users
              aria-hidden="true"
              className="size-5 text-[var(--text-muted)]"
            />
            <p className="text-[0.8125rem] text-[var(--text-muted)]">
              {rows.length
                ? "Nikt nie pasuje do wyszukiwania."
                : "Tu pojawią się osoby, które umówiły się do Ciebie."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
