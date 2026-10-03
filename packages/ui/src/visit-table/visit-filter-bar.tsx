"use client";

import {
  Check,
  ChevronLeft,
  Filter,
  LoaderCircle,
  Search,
  X,
} from "lucide-react";
import { debounce, useQueryStates } from "nuqs";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import { cn } from "../lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../tooltip";
import {
  visitTableParsers,
  type VisitPastScope,
  type VisitPaymentFilter,
  type VisitScope,
  type VisitStatusFilter,
} from "./params";

// The bookings table's filter bar (docs/product/booking-plan.md, R9): the
// search, folded to a magnifier until used; a chip per filter (a click
// changes its values, "×" removes it); and, at the right edge, the filter
// button with the fields to filter by. Every change goes to the address,
// and the server renders the table again.

export interface FilterChoice {
  id: string;
  name: string;
}

export interface VisitFilterBarProps {
  specialists?: FilterChoice[];
  services?: FilterChoice[];
  rooms?: FilterChoice[];
  /** The payment filter (admins). */
  showPayments?: boolean;
  /** First in the bar: the view picker ("Nadchodzące 42 ▾"). */
  view?: ReactNode;
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
];
const PAST: { value: VisitPastScope; label: string }[] = [
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

/** Where a date field lives in the address: its range, or its own days. */
const DATE_KEYS = {
  termin: { scope: "zakres", from: "od", to: "do" },
  utworzono: { scope: "utworzono", from: "utworzono_od", to: "utworzono_do" },
  zmiana: { scope: "zmiana", from: "zmiana_od", to: "zmiana_do" },
} as const;
type DateFieldId = keyof typeof DATE_KEYS;

type ListFieldId = "status" | "platnosc" | "specjalista" | "usluga" | "miejsce";

type FieldId = DateFieldId | ListFieldId;

interface Field {
  id: FieldId;
  label: string;
  /** A range of dates (one ready range, or days of its own), or a list. */
  dates: boolean;
  options: { value: string; label: string }[];
  /** The values chosen (none: not filtered). */
  chosen: string[];
  /** A date field's own days. */
  own?: { from: string | null; to: string | null };
}

const isDateField = (id: FieldId): id is DateFieldId => id in DATE_KEYS;

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

/** `01.10.2026` */
const shortDate = (date: string) => date.split("-").reverse().join(".");

const CHIP =
  "inline-flex h-6 items-stretch overflow-hidden rounded-[5px] border border-[var(--border)] bg-[var(--surface)] text-[0.78rem]";
const CHIP_PART =
  "inline-flex items-center gap-1 px-2 hover:bg-[var(--surface-subtle)] focus-visible:bg-[var(--surface-subtle)] focus-visible:outline-none";
const MENU = "w-64 p-1 text-[0.8125rem]";
const OPTION =
  "flex h-7 w-full items-center gap-2 rounded-[5px] px-2 text-left hover:bg-[var(--surface-subtle)] focus-visible:bg-[var(--surface-subtle)] focus-visible:outline-none";

function Box({ checked, round }: { checked: boolean; round?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-3.5 shrink-0 place-items-center border",
        round ? "rounded-full" : "rounded-[3px]",
        checked
          ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
          : "border-[var(--border-strong)]",
      )}
    >
      {checked ? <Check className="size-2.5" strokeWidth={3} /> : null}
    </span>
  );
}

export function VisitFilterBar({
  specialists = [],
  services = [],
  rooms,
  showPayments = false,
  view,
  order = [],
}: VisitFilterBarProps) {
  const [pending, startTransition] = useTransition();
  const [params, setParams] = useQueryStates(PARSERS, {
    shallow: false,
    startTransition,
    clearOnDefault: true,
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FieldId | null>(null);

  const dateField = (
    id: DateFieldId,
    label: string,
    options: { value: string; label: string }[],
  ): Field => {
    const keys = DATE_KEYS[id];
    const scope = params[keys.scope];
    const from = params[keys.from];
    const to = params[keys.to];
    return {
      id,
      label,
      dates: true,
      options,
      own: { from, to },
      chosen:
        from || to ? ["wlasny"] : scope && scope !== "wszystkie" ? [scope] : [],
    };
  };
  const listField = (
    id: ListFieldId,
    label: string,
    options: { value: string; label: string }[],
  ): Field => ({
    id,
    label,
    dates: false,
    options,
    chosen: params[id] ?? [],
  });

  const unordered: Field[] = [
    dateField("termin", "Termin", PERIODS),
    dateField("utworzono", "Utworzono", PAST),
    dateField("zmiana", "Zmiana", PAST),
    listField("status", "Status", STATUSES),
    ...(showPayments ? [listField("platnosc", "Płatność", PAYMENTS)] : []),
    ...(specialists.length
      ? [
          listField(
            "specjalista",
            "Specjalista",
            specialists.map((one) => ({ value: one.id, label: one.name })),
          ),
        ]
      : []),
    ...(services.length
      ? [
          listField(
            "usluga",
            "Usługa",
            services.map((one) => ({ value: one.id, label: one.name })),
          ),
        ]
      : []),
    ...(rooms
      ? [
          listField("miejsce", "Miejsce", [
            { value: "online", label: "Online" },
            ...rooms.map((one) => ({ value: one.id, label: one.name })),
          ]),
        ]
      : []),
  ];
  // As the columns go: moved in "Kolumny", they move here too.
  const placeOf = (id: FieldId) => {
    const at = order.indexOf(id);
    return at === -1 ? order.length : at;
  };
  const fields = unordered
    .map((field, index) => ({ field, index }))
    .sort(
      (a, b) => placeOf(a.field.id) - placeOf(b.field.id) || a.index - b.index,
    )
    .map(({ field }) => field);
  const active = fields.filter((field) => field.chosen.length);

  // Every change starts at page 1 with the side panel closed.
  const change = (patch: Partial<typeof params>) =>
    void setParams({ ...patch, strona: null, wizyta: null });

  /** A date field set to a ready range, days of its own, or nothing. */
  const setDates = (
    id: DateFieldId,
    value: { scope?: string | null; from?: string | null; to?: string | null },
  ) => {
    const keys = DATE_KEYS[id];
    change({
      [keys.scope]: value.scope ?? null,
      [keys.from]: value.from ?? null,
      [keys.to]: value.to ?? null,
    });
  };

  const choose = (field: Field, value: string) => {
    if (isDateField(field.id)) return setDates(field.id, { scope: value });
    const id = field.id;
    const now: string[] = params[id] ?? [];
    const next = now.includes(value)
      ? now.filter((one) => one !== value)
      : [...now, value];
    change({ [id]: next.length ? next : null });
  };
  const ownDays = (id: DateFieldId, from: string | null, to: string | null) =>
    // For the visit's date "nadchodzace" is only the default, under them.
    setDates(id, { scope: id === "termin" ? "nadchodzace" : null, from, to });
  const remove = (id: FieldId) =>
    isDateField(id)
      ? setDates(id, { scope: id === "termin" ? "wszystkie" : null })
      : change({ [id]: null });
  const clearAll = () =>
    change({
      zakres: "wszystkie",
      od: null,
      do: null,
      utworzono: null,
      utworzono_od: null,
      utworzono_do: null,
      zmiana: null,
      zmiana_od: null,
      zmiana_do: null,
      status: null,
      platnosc: null,
      specjalista: null,
      usluga: null,
      miejsce: null,
    });

  const chipValue = (field: Field) => {
    if (field.own && (field.own.from || field.own.to)) {
      const { from, to } = field.own;
      return `${from ? shortDate(from) : "…"} – ${to ? shortDate(to) : "…"}`;
    }
    const labels = field.chosen.map(
      (value) => field.options.find((o) => o.value === value)?.label ?? value,
    );
    return labels.length > 2
      ? `${labels[0]} i ${labels.length - 1} inne`
      : labels.join(", ");
  };

  const editingField = fields.find((field) => field.id === editing) ?? null;

  return (
    <div className="flex min-h-9 flex-wrap items-center gap-1.5 border-b border-[var(--border)] px-2 py-1.5">
      {view ? (
        <>
          {view}
          <span
            aria-hidden="true"
            className="mx-0.5 h-4 w-px bg-[var(--border)]"
          />
        </>
      ) : null}
      <TableSearch pending={pending} />
      {active.map((field) => (
        <span className={CHIP} key={field.id}>
          <Popover>
            <PopoverTrigger className={CHIP_PART}>
              <span className="text-[var(--text-muted)]">
                {field.label}
                {field.dates ? ":" : " jest"}
              </span>
              <span className="font-semibold text-[var(--text)]">
                {chipValue(field)}
              </span>
            </PopoverTrigger>
            <PopoverContent align="start" className={MENU}>
              <FieldValues
                field={field}
                onChoose={(value) => choose(field, value)}
                onOwnRange={(from, to) => {
                  if (isDateField(field.id)) ownDays(field.id, from, to);
                }}
              />
            </PopoverContent>
          </Popover>
          <button
            aria-label={`Usuń filtr ${field.label}`}
            className={cn(
              CHIP_PART,
              "border-l border-[var(--border)] px-1 text-[var(--text-muted)] hover:text-[var(--danger)]",
            )}
            onClick={() => remove(field.id)}
            type="button"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        </span>
      ))}
      <Popover
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setEditing(null);
        }}
        open={open}
      >
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger
                aria-label={`Filtry${active.length ? `, ustawione: ${active.length}` : ""}`}
                className="relative ml-auto inline-grid size-7 place-items-center rounded-[5px] text-[var(--text-muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none data-[state=open]:bg-[var(--surface-subtle)] data-[state=open]:text-[var(--text)]"
              >
                <Filter aria-hidden="true" className="size-4" />
                {active.length ? (
                  <span
                    aria-hidden="true"
                    className="absolute -top-0.5 -right-0.5 min-w-3.5 rounded-full bg-[var(--primary)] px-1 text-center text-[0.6rem] leading-3.5 font-semibold text-[var(--primary-foreground)] tabular-nums"
                  >
                    {active.length}
                  </span>
                ) : null}
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Filtry</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <PopoverContent align="end" className={MENU}>
          {editingField ? (
            <>
              <button
                className={cn(OPTION, "text-[var(--text-muted)]")}
                onClick={() => setEditing(null)}
                type="button"
              >
                <ChevronLeft aria-hidden="true" className="size-3.5" />
                {editingField.label}
              </button>
              <div className="my-1 h-px bg-[var(--border)]" />
              <FieldValues
                field={editingField}
                onChoose={(value) => choose(editingField, value)}
                onOwnRange={(from, to) => {
                  if (isDateField(editingField.id)) {
                    ownDays(editingField.id, from, to);
                  }
                  setOpen(false);
                }}
              />
            </>
          ) : (
            <>
              <div className="flex h-7 items-center justify-between pr-1 pl-2 text-[0.7rem] text-[var(--text-muted)]">
                Filtruj według
                {active.length ? (
                  <button
                    className="h-6 rounded-[4px] px-1.5 text-[0.75rem] font-semibold text-[var(--primary)] hover:bg-[var(--surface-subtle)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                    onClick={clearAll}
                    type="button"
                  >
                    Wyczyść wszystkie
                  </button>
                ) : null}
              </div>
              <ul className="grid gap-px">
                {fields.map((field) => {
                  const on = field.chosen.length > 0;
                  return (
                    <li
                      className={cn(
                        "flex items-center rounded-[5px]",
                        on && "bg-[var(--primary-soft)]",
                      )}
                      key={field.id}
                    >
                      <button
                        className={cn(
                          OPTION,
                          on &&
                            "font-semibold text-[var(--primary)] hover:bg-transparent",
                        )}
                        aria-label={
                          on
                            ? `${field.label}, w pasku, wartości: ${field.chosen.length}`
                            : undefined
                        }
                        onClick={() => setEditing(field.id)}
                        type="button"
                      >
                        <span aria-hidden="true" className="w-3.5">
                          {on ? <Check className="size-3.5" /> : null}
                        </span>
                        {field.label}
                        {on ? (
                          <span
                            aria-hidden="true"
                            className="ml-auto text-[0.7rem] text-[var(--text-muted)] tabular-nums"
                          >
                            {field.chosen.length}
                          </span>
                        ) : null}
                      </button>
                      {on ? (
                        <button
                          aria-label={`Usuń filtr ${field.label}`}
                          className="mr-0.5 grid size-6 shrink-0 place-items-center rounded-[4px] text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--danger)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                          onClick={() => remove(field.id)}
                          type="button"
                        >
                          <X aria-hidden="true" className="size-3.5" />
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** A field's values: tick several, or (dates) a range or days of its own. */
function FieldValues({
  field,
  onChoose,
  onOwnRange,
}: {
  field: Field;
  onChoose: (value: string) => void;
  onOwnRange: (from: string | null, to: string | null) => void;
}) {
  const ownRange = field.own;
  const apply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const from = String(form.get("od") ?? "") || null;
    const to = String(form.get("do") ?? "") || null;
    const [first, last] = from && to && from > to ? [to, from] : [from, to];
    onOwnRange(first, last);
  };
  return (
    <div>
      <ul
        aria-label={`Wartości: ${field.label}`}
        className="grid gap-px"
        role="group"
      >
        {field.options.map((option) => {
          const checked = field.chosen.includes(option.value);
          return (
            <li key={option.value}>
              <button
                aria-checked={checked}
                className={OPTION}
                onClick={() => onChoose(option.value)}
                role={field.dates ? "menuitemradio" : "menuitemcheckbox"}
                type="button"
              >
                <Box checked={checked} round={field.dates} />
                <span className="truncate">{option.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {ownRange ? (
        <form
          className="mt-1 grid gap-1.5 border-t border-[var(--border)] px-2 pt-2 pb-1"
          onSubmit={apply}
        >
          <p className="text-[0.7rem] text-[var(--text-muted)]">
            Własny zakres dat
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            <label className="grid gap-0.5 text-[0.7rem] text-[var(--text-muted)]">
              Od
              <input
                className="h-7 rounded-[5px] border border-[var(--border)] bg-[var(--surface)] px-1.5 text-[0.78rem] text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                defaultValue={ownRange.from ?? ""}
                name="od"
                type="date"
              />
            </label>
            <label className="grid gap-0.5 text-[0.7rem] text-[var(--text-muted)]">
              Do
              <input
                className="h-7 rounded-[5px] border border-[var(--border)] bg-[var(--surface)] px-1.5 text-[0.78rem] text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                defaultValue={ownRange.to ?? ""}
                name="do"
                type="date"
              />
            </label>
          </div>
          <button
            className="h-7 rounded-[5px] bg-[var(--primary)] px-2 text-[0.78rem] font-semibold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
            type="submit"
          >
            Pokaż
          </button>
        </form>
      ) : null}
    </div>
  );
}

/**
 * The search box, folded to a magnifier until used: it opens on a click or
 * "/", and folds again when empty and left.
 */
function TableSearch({ pending }: { pending: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [{ q }, setParams] = useQueryStates(
    { q: visitTableParsers.q, strona: visitTableParsers.strona },
    { shallow: false, clearOnDefault: true },
  );
  const [focused, setFocused] = useState(false);
  const open = focused || Boolean(q);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        event.key !== "/" ||
        target?.closest("input, textarea, select, [contenteditable='true']")
      ) {
        return;
      }
      event.preventDefault();
      input.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <label
      className={cn(
        "inline-flex h-7 items-center rounded-[5px] border px-1.5 text-[var(--text-muted)] transition-colors",
        open
          ? "cursor-text border-[var(--primary)] bg-[var(--surface)] text-[var(--text)]"
          : "cursor-pointer border-transparent hover:bg-[var(--surface-subtle)]",
      )}
      title={open ? undefined : "Szukaj (/)"}
    >
      {pending ? (
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
      ) : (
        <Search aria-hidden="true" className="size-4" />
      )}
      <span className="sr-only">Szukaj rezerwacji</span>
      <input
        className={cn(
          "h-full border-0 bg-transparent text-[0.8125rem] text-[var(--text)] outline-none placeholder:text-[var(--text-subtle)] motion-safe:transition-[width,padding] motion-safe:duration-200 [&::-webkit-search-cancel-button]:hidden",
          open ? "w-48 cursor-text pl-1.5" : "w-0 cursor-pointer p-0",
        )}
        maxLength={100}
        onBlur={() => setFocused(false)}
        onChange={(event) =>
          setParams(
            { q: event.target.value || null, strona: null },
            {
              limitUrlUpdates: event.target.value ? debounce(300) : undefined,
            },
          )
        }
        onFocus={() => setFocused(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && q) {
            event.stopPropagation();
            void setParams({ q: null, strona: null });
          }
        }}
        placeholder="Szukaj klienta, numeru…"
        ref={input}
        type="search"
        value={q ?? ""}
      />
    </label>
  );
}
