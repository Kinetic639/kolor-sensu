"use client";

import { TableSearch } from "../data-table/filter-bar";
import { roomListParsers } from "./params";

// The rooms' roster search: names and places; the server filters again.

const PARSERS = { q: roomListParsers.q };

export function RoomSearch() {
  return (
    <TableSearch
      label="Szukaj gabinetu"
      parsers={PARSERS}
      placeholder="Szukaj gabinetu, lokalizacji…"
    />
  );
}
