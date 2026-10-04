"use client";

import { TableSearch } from "../data-table/filter-bar";
import { serviceListParsers } from "./params";

// The offer's roster search: names and addresses; the server filters again.

const PARSERS = { q: serviceListParsers.q };

export function ServiceSearch() {
  return (
    <TableSearch
      label="Szukaj usługi"
      parsers={PARSERS}
      placeholder="Szukaj usługi…"
    />
  );
}
