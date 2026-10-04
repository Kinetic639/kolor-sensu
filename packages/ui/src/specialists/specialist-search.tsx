"use client";

import { TableSearch } from "../data-table/filter-bar";
import { specialistListParsers } from "./params";

// The team roster's search: the tables' box (folded to a magnifier until
// used), searching names and titles; the server filters again.

const PARSERS = { q: specialistListParsers.q };

export function SpecialistSearch() {
  return (
    <TableSearch
      label="Szukaj specjalisty"
      parsers={PARSERS}
      placeholder="Szukaj imienia, nazwiska, tytułu…"
    />
  );
}
