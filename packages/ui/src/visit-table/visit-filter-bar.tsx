"use client";

import {
  FilterBar,
  type FilterChoice,
  type FilterField,
} from "../data-table/filter-bar";
import {
  visitTableParsers,
  type VisitPastScope,
  type VisitPaymentFilter,
  type VisitScope,
  type VisitStatusFilter,
} from "./params";

// The bookings table's filter bar (docs/product/booking-plan.md, R9): the
// portals' bar (../data-table) with the bookings' fields. The visit's date
// and when it was made or last changed are ranges of dates; status,
// payment, specialist, service and place take several values each.

export type { FilterChoice };

export interface VisitFilterBarProps {
  specialists?: FilterChoice[];
  services?: FilterChoice[];
  rooms?: FilterChoice[];
  /** The payment filter (admins). */
  showPayments?: boolean;
  /**
   * The table's columns in their order: the filters follow it (those of
   * no column after).
   */
  order?: readonly string[];
}

const PERIODS: { value: VisitScope; label: string }[] = [
  { value: "nadchodzace", label: "Nadchodzące" },
  { value: "dzis", label: "Dziś" },
  { value: "jutro", label: "Jutro" },
  { value: "ten-tydzien", label: "Ten tydzień" },
  { value: "nastepny-tydzien", label: "Przyszły tydzień" },
  { value: "ten-miesiac", label: "Ten miesiąc" },
  { value: "minione", label: "Minione" },
  { value: "archiwum", label: "Archiwum" },
  { value: "do-zamkniecia", label: "Do zamknięcia" },
];
export const PAST_RANGES: { value: VisitPastScope; label: string }[] = [
  { value: "dzis", label: "Dziś" },
  { value: "wczoraj", label: "Wczoraj" },
  { value: "ten-tydzien", label: "Ten tydzień" },
  { value: "ostatnie-7-dni", label: "Ostatnie 7 dni" },
  { value: "ten-miesiac", label: "Ten miesiąc" },
  { value: "ostatnie-30-dni", label: "Ostatnie 30 dni" },
];
const STATUSES: { value: VisitStatusFilter; label: string }[] = [
  { value: "potwierdzone", label: "Potwierdzona" },
  { value: "oczekujace", label: "Czeka na płatność" },
  { value: "odwolane", label: "Odwołana" },
];
const PAYMENTS: { value: VisitPaymentFilter; label: string }[] = [
  { value: "oplacone", label: "Opłacona" },
  { value: "nieoplacone", label: "Nieopłacona" },
  { value: "do-zwrotu", label: "Zwrot do zlecenia" },
  { value: "zwrocone", label: "Zwrócona" },
];

const PARSERS = {
  q: visitTableParsers.q,
  status: visitTableParsers.status,
  platnosc: visitTableParsers.platnosc,
  specjalista: visitTableParsers.specjalista,
  usluga: visitTableParsers.usluga,
  miejsce: visitTableParsers.miejsce,
  zakres: visitTableParsers.zakres,
  od: visitTableParsers.od,
  do: visitTableParsers.do,
  utworzono: visitTableParsers.utworzono,
  utworzono_od: visitTableParsers.utworzono_od,
  utworzono_do: visitTableParsers.utworzono_do,
  zmiana: visitTableParsers.zmiana,
  zmiana_od: visitTableParsers.zmiana_od,
  zmiana_do: visitTableParsers.zmiana_do,
  strona: visitTableParsers.strona,
  wizyta: visitTableParsers.wizyta,
};

const choices = (list: FilterChoice[]) =>
  list.map((one) => ({ value: one.id, label: one.name }));

export function VisitFilterBar({
  specialists = [],
  services = [],
  rooms,
  showPayments = false,
  order,
}: VisitFilterBarProps) {
  const fields: FilterField[] = [
    {
      kind: "dates",
      id: "termin",
      label: "Termin",
      options: PERIODS,
      keys: { scope: "zakres", from: "od", to: "do" },
      // "Nadchodzące" is the default: removed, the table shows every date.
      removed: "wszystkie",
      underOwn: "nadchodzace",
      none: "wszystkie",
    },
    {
      kind: "dates",
      id: "utworzono",
      label: "Utworzono",
      options: PAST_RANGES,
      keys: { scope: "utworzono", from: "utworzono_od", to: "utworzono_do" },
    },
    {
      kind: "dates",
      id: "zmiana",
      label: "Zmiana",
      options: PAST_RANGES,
      keys: { scope: "zmiana", from: "zmiana_od", to: "zmiana_do" },
    },
    { kind: "list", id: "status", label: "Status", options: STATUSES },
    ...(showPayments
      ? [
          {
            kind: "list" as const,
            id: "platnosc",
            label: "Płatność",
            options: PAYMENTS,
          },
        ]
      : []),
    ...(specialists.length
      ? [
          {
            kind: "list" as const,
            id: "specjalista",
            label: "Specjalista",
            options: choices(specialists),
          },
        ]
      : []),
    ...(services.length
      ? [
          {
            kind: "list" as const,
            id: "usluga",
            label: "Usługa",
            options: choices(services),
          },
        ]
      : []),
    ...(rooms
      ? [
          {
            kind: "list" as const,
            id: "miejsce",
            label: "Miejsce",
            options: [{ value: "online", label: "Online" }, ...choices(rooms)],
          },
        ]
      : []),
  ];
  return (
    <FilterBar
      fields={fields}
      order={order}
      parsers={PARSERS}
      resetOnChange={["strona", "wizyta"]}
      search={{
        label: "Szukaj rezerwacji",
        placeholder: "Szukaj klienta, numeru…",
      }}
    />
  );
}
