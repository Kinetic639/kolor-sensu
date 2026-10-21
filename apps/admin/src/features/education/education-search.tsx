"use client";

import { TableSearch } from "@repo/ui/data-table";
import { useQueryStates } from "nuqs";
import { educationListParsers } from "./search-params";

// Edukacja's list controls in the address: the search (the server filters
// again) and, for articles, the category.

const PARSERS = { q: educationListParsers.q };

export function EducationSearch({ label }: { label: string }) {
  return (
    <TableSearch label={label} parsers={PARSERS} placeholder={`${label}…`} />
  );
}

export function CategoryFilter({
  categories,
}: {
  categories: readonly { id: string; name: string }[];
}) {
  const [{ kategoria }, setParams] = useQueryStates(
    { kategoria: educationListParsers.kategoria },
    { shallow: false },
  );
  if (categories.length === 0) return null;
  return (
    <select
      aria-label="Kategoria"
      className="h-7 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] px-2 text-[0.8125rem] text-[var(--text)] focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
      onChange={(event) =>
        void setParams({ kategoria: event.target.value || null })
      }
      value={kategoria ?? ""}
    >
      <option value="">Wszystkie kategorie</option>
      {categories.map((one) => (
        <option key={one.id} value={one.id}>
          {one.name}
        </option>
      ))}
    </select>
  );
}
