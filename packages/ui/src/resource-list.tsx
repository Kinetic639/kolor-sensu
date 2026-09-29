"use client";

import { ChevronRight, Search, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import {
  useDeferredValue,
  useId,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Button } from "./button";
import { Input } from "./input";
import { cn } from "./lib/utils";
import { StatusBadge, type StatusTone } from "./portal-content";

// The list of rooms or specialists in the admin: a handful to a dozen, so
// the page renders all of them and the search and filters work here, in the
// browser, instantly.

export interface ResourceListItem {
  id: string;
  href: string;
  name: string;
  /** A second line under the name (a title, a location); searched too. */
  description?: string;
  /** A person's picture (initials on their tint until it loads). */
  avatar?: {
    url: string | null;
    initials: string;
    accent: string;
    tint: string;
  };
  /** A place's colour, as a mark before the name (when there's no avatar). */
  color?: string;
  /** Short facts ("4 usługi", "Pn–Pt 8–18"), hidden on narrow screens. */
  facts?: string[];
  statuses?: { label: string; tone: StatusTone }[];
  /** The filters the item belongs to. */
  tags: string[];
  /** Inactive: the name is dimmed. */
  muted?: boolean;
}

export interface ResourceListFilter {
  id: string;
  label: string;
}

export interface ResourceListProps {
  items: ResourceListItem[];
  /** The accessible name of the list. */
  label: string;
  filters?: ResourceListFilter[];
  allLabel?: string;
  searchLabel: string;
  searchPlaceholder?: string;
  /** Shown when there are no items at all. */
  emptyText: string;
  /** Shown when the search and filter leave nothing. */
  noMatchText: string;
  /** The main action (e.g. "Dodaj gabinet"), at the end of the toolbar. */
  actions?: ReactNode;
}

const ALL = "";

/** Lower case, without Polish accents: "Zielińska" matches "zielinska". */
function normalize(text: string) {
  return text
    .toLocaleLowerCase("pl")
    .replaceAll("ł", "l")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function ResourceList({
  items,
  label,
  filters = [],
  allLabel = "Wszystkie",
  searchLabel,
  searchPlaceholder = "Szukaj…",
  emptyText,
  noMatchText,
  actions,
}: ResourceListProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(ALL);
  const query = normalize(useDeferredValue(search).trim());
  const filterName = useId();

  const found = useMemo(
    () =>
      query
        ? items.filter((item) =>
            normalize(`${item.name} ${item.description ?? ""}`).includes(query),
          )
        : items,
    [items, query],
  );
  const shown =
    filter === ALL ? found : found.filter((item) => item.tags.includes(filter));

  const clear = () => {
    setSearch("");
    setFilter(ALL);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative w-full sm:w-64">
          <span className="sr-only">{searchLabel}</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <Input
            className="pl-9"
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            type="search"
            value={search}
          />
        </label>

        {filters.length > 0 ? (
          <div
            aria-label="Filtr"
            className="flex flex-wrap items-center gap-1.5"
            role="radiogroup"
          >
            {[{ id: ALL, label: allLabel }, ...filters].map((option) => {
              const count =
                option.id === ALL
                  ? found.length
                  : found.filter((item) => item.tags.includes(option.id))
                      .length;
              const checked = filter === option.id;
              return (
                <label
                  className={cn(
                    "inline-flex h-10 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border px-2.5 text-xs font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--ring)]",
                    checked
                      ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]",
                  )}
                  key={option.id || "all"}
                >
                  <input
                    checked={checked}
                    className="sr-only"
                    name={filterName}
                    onChange={() => setFilter(option.id)}
                    type="radio"
                  />
                  {option.label}
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[0.625rem] tabular-nums",
                      checked
                        ? "bg-[color-mix(in_srgb,white_20%,transparent)]"
                        : "bg-[var(--surface-muted)]",
                    )}
                  >
                    {count}
                  </span>
                </label>
              );
            })}
          </div>
        ) : null}

        {actions ? <div className="ml-auto flex gap-2">{actions}</div> : null}
      </div>

      <div className="overflow-hidden rounded-[var(--radius-surface)] border border-[var(--border)] bg-[var(--surface)]">
        {items.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">
            {emptyText}
          </p>
        ) : shown.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-10 text-center text-sm text-[var(--text-muted)]">
            <p>{noMatchText}</p>
            <Button onClick={clear} size="sm" variant="secondary">
              <X aria-hidden="true" className="size-4" />
              Wyczyść wyszukiwanie i filtry
            </Button>
          </div>
        ) : (
          <ul aria-label={label} className="divide-y divide-[var(--border)]">
            {shown.map((item) => (
              <ResourceRow item={item} key={item.id} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ResourceRow({ item }: { item: ResourceListItem }) {
  return (
    <li className="relative flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5 transition-colors focus-within:bg-[var(--surface-muted)] hover:bg-[var(--surface-muted)] sm:flex-nowrap">
      {item.avatar ? (
        // A ring in their colour, as in the schedules.
        <Avatar
          className="size-9 ring-2 ring-[var(--resource-accent)] ring-offset-2 ring-offset-[var(--surface)]"
          style={
            {
              "--resource-accent": item.avatar.accent,
              "--resource-tint": item.avatar.tint,
            } as CSSProperties
          }
        >
          {item.avatar.url ? (
            <AvatarImage alt="" src={item.avatar.url} />
          ) : null}
          <AvatarFallback className="bg-[var(--resource-tint)] text-xs text-[var(--text)]">
            {item.avatar.initials}
          </AvatarFallback>
        </Avatar>
      ) : item.color ? (
        <span
          aria-hidden="true"
          className="h-8 w-1 shrink-0 rounded-full"
          data-testid="resource-color"
          style={{ backgroundColor: item.color }}
        />
      ) : null}

      <div className="min-w-0 flex-1">
        {/* The link covers the whole row; its name is the resource's name. */}
        <Link
          className={cn(
            "block truncate text-sm font-semibold outline-none after:absolute after:inset-0 focus-visible:underline",
            item.muted ? "text-[var(--text-muted)]" : "text-[var(--text)]",
          )}
          href={item.href as Route}
        >
          {item.name}
        </Link>
        {item.description ? (
          <p className="truncate text-xs text-[var(--text-muted)]">
            {item.description}
          </p>
        ) : null}
      </div>

      {item.facts?.length ? (
        <ul className="hidden shrink-0 items-center gap-4 text-xs text-[var(--text-muted)] md:flex">
          {item.facts.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
      ) : null}

      {item.statuses?.length ? (
        // Beside the name on wider screens, under it on phones.
        <div
          className={cn(
            "order-last flex basis-full flex-wrap gap-1.5 sm:order-none sm:basis-auto sm:justify-end sm:pl-0",
            item.avatar ? "pl-12" : item.color ? "pl-4" : undefined,
          )}
        >
          {item.statuses.map((status) => (
            <StatusBadge key={status.label} tone={status.tone}>
              {status.label}
            </StatusBadge>
          ))}
        </div>
      ) : null}

      <ChevronRight
        aria-hidden="true"
        className="size-4 shrink-0 text-[var(--text-subtle)]"
      />
    </li>
  );
}
