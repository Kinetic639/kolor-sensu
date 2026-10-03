"use client";

import { FilterBar, type FilterField } from "../data-table/filter-bar";
import { PAST_RANGES } from "../visit-table/visit-filter-bar";
import { clientTableParsers } from "./params";

// The clients list's filter bar: the portals' bar (../data-table) with the
// clients' fields. A visit to come or not; when the last visit was and
// since when a client, as ranges of dates.

const FIELDS: FilterField[] = [
  {
    kind: "list",
    id: "nadchodzaca",
    label: "Nadchodząca wizyta",
    options: [
      { value: "jest", label: "Jest" },
      { value: "brak", label: "Brak" },
    ],
  },
  {
    kind: "dates",
    id: "ostatnia",
    label: "Ostatnia wizyta",
    options: PAST_RANGES,
    keys: { scope: "ostatnia", from: "ostatnia_od", to: "ostatnia_do" },
  },
  {
    kind: "dates",
    id: "dodany",
    label: "Klient od",
    options: PAST_RANGES,
    keys: { scope: "dodany", from: "dodany_od", to: "dodany_do" },
  },
];

// Each filter sits by its column ("Nadchodzące", "Ostatnia wizyta", …).
const COLUMN_OF: Record<string, string> = {
  nadchodzace: "nadchodzaca",
  ostatnia: "ostatnia",
  dodany: "dodany",
};

const PARSERS = {
  q: clientTableParsers.q,
  nadchodzaca: clientTableParsers.nadchodzaca,
  ostatnia: clientTableParsers.ostatnia,
  ostatnia_od: clientTableParsers.ostatnia_od,
  ostatnia_do: clientTableParsers.ostatnia_do,
  dodany: clientTableParsers.dodany,
  dodany_od: clientTableParsers.dodany_od,
  dodany_do: clientTableParsers.dodany_do,
  strona: clientTableParsers.strona,
  klient: clientTableParsers.klient,
};

export function ClientFilterBar({
  order = [],
}: {
  /** The list's columns in their order: the filters follow it. */
  order?: readonly string[];
}) {
  return (
    <FilterBar
      fields={FIELDS}
      order={order.map((id) => COLUMN_OF[id] ?? id)}
      parsers={PARSERS}
      resetOnChange={["strona", "klient"]}
      search={{
        label: "Szukaj klienta",
        placeholder: "Szukaj nazwiska, e-maila, telefonu…",
      }}
    />
  );
}
