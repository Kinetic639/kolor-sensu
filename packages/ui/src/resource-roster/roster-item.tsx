"use client";

import { ChevronRight } from "lucide-react";
import { useQueryState } from "nuqs";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { cn } from "../lib/utils";
import { openTab, parseAsOpenRows, withRow, withTab } from "./open-rows";
import { EXPAND_MS, useExpand } from "./use-expand";

// A row of a roster (a specialist, a room): who or what it is and the
// week at a glance; a click opens it in place, on tabs, each with the
// whole width. Several may be open; which, and on which tab, is kept in
// the address (`?otwarte=`), so the server renders them open on a refresh.
// Every tab comes rendered from the server: opening asks for nothing.

export interface RosterTab {
  key: string;
  label: string;
  /** A count after the name. */
  count?: number;
  content: ReactNode;
}

const OPEN = parseAsOpenRows.withOptions({
  shallow: true,
  history: "replace",
  scroll: false,
});

export function RosterItem({
  id,
  name,
  identity,
  summary,
  menu,
  tabs,
  actions,
  muted = false,
  summaryClassName,
  wideIdentity = false,
}: {
  id: string;
  /** Who or what it is, for the button's name. */
  name: string;
  /** The picture and the name, in the toggle. */
  identity: ReactNode;
  /** The week at a glance, beside it (its own columns). */
  summary: ReactNode;
  /** The "⋮" menu. */
  menu?: ReactNode;
  tabs: RosterTab[];
  /** Under the tabs: the ways on. */
  actions?: ReactNode;
  /** Not working now (inactive, closed): in grey. */
  muted?: boolean;
  /** The summary's columns on a wide screen (the same in every row). */
  summaryClassName?: string;
  /** Long names (services): a wider first column on a wide screen. */
  wideIdentity?: boolean;
}) {
  const [rows, setRows] = useQueryState("otwarte", OPEN);
  const tab = openTab(rows, id);
  // The row opens and closes at once; the address follows once it has
  // (a new address renders the page again, which would stall the motion).
  const [moving, setMoving] = useState<boolean | null>(null);
  const inAddress = tab !== undefined;
  const open = moving ?? inAddress;
  const write = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (moving !== null && moving === inAddress) setMoving(null);
  }, [moving, inAddress]);
  useEffect(() => () => clearTimeout(write.current), []);
  const active = tabs.find((one) => one.key === tab) ?? tabs[0];
  const base = useId();
  const tablist = useRef<HTMLDivElement>(null);
  const { shown, expanded } = useExpand(open);

  const toggle = () => {
    const next = !open;
    setMoving(next);
    clearTimeout(write.current);
    write.current = setTimeout(
      () => void setRows((now) => withRow(now, id, next)),
      EXPAND_MS + 20,
    );
  };
  // A click anywhere on the row opens it, but not on its own links and menu.
  const onRowClick = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("a, button, [role='menu']")) {
      return;
    }
    toggle();
  };
  const choose = (key: string) =>
    void setRows((now) => withTab(now, id, key === tabs[0]?.key ? null : key));
  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const at = tabs.findIndex((one) => one.key === active?.key);
    const step = event.key === "ArrowRight" ? 1 : tabs.length - 1;
    const next = tabs[(at + step) % tabs.length]!;
    choose(next.key);
    tablist.current
      ?.querySelector<HTMLButtonElement>(`[data-tab="${next.key}"]`)
      ?.focus();
  };

  return (
    <article
      aria-label={name}
      className={cn(
        // In the roster's scrolling column it keeps its height (open, tall).
        "shrink-0 overflow-hidden rounded-[8px] border bg-[var(--surface)]",
        open
          ? "border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] shadow-[0_1px_3px_rgb(16_32_28/0.06)]"
          : "border-[var(--border)]",
      )}
    >
      <div
        className={cn(
          "grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5 px-2 py-2.5 hover:bg-[var(--surface-subtle)] lg:gap-x-3.5",
          wideIdentity
            ? "lg:grid-cols-[19rem_minmax(0,1fr)_28px]"
            : "lg:grid-cols-[15rem_minmax(0,1fr)_28px]",
          // Grey, not see-through: the text keeps its contrast.
          muted && "[&>*:not(:last-child)]:grayscale",
        )}
        onClick={onRowClick}
      >
        <button
          aria-controls={`${base}-body`}
          aria-expanded={open}
          className="col-start-1 row-start-1 flex min-w-0 items-center gap-2 rounded-[6px] text-left focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
          onClick={toggle}
          type="button"
        >
          <ChevronRight
            aria-hidden="true"
            className={cn(
              "size-4 shrink-0 text-[var(--text-muted)] transition-transform motion-reduce:transition-none",
              open && "rotate-90 text-[var(--primary)]",
            )}
          />
          {identity}
        </button>
        <div
          className={cn(
            "col-span-full row-start-2 grid min-w-0 items-center gap-x-3.5 gap-y-2 pl-6 lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:pl-0",
            summaryClassName,
          )}
        >
          {summary}
        </div>
        <div className="col-start-2 row-start-1 flex justify-end lg:col-start-3">
          {menu}
        </div>
      </div>

      {/* Its height eases open and closed (./use-expand). */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
        hidden={!shown}
        id={`${base}-body`}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            aria-label={`Sekcje: ${name}`}
            className="flex h-[34px] items-stretch gap-4 overflow-x-auto border-t border-b border-[color-mix(in_srgb,var(--border)_60%,transparent)] px-3.5 [scrollbar-width:none] lg:pl-[46px]"
            ref={tablist}
            role="tablist"
          >
            {tabs.map((one) => {
              const selected = one.key === active?.key;
              return (
                <button
                  aria-controls={`${base}-${one.key}`}
                  aria-selected={selected}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 text-[0.8125rem] whitespace-nowrap outline-none focus-visible:underline",
                    selected
                      ? "font-semibold text-[var(--text)] shadow-[inset_0_-2px_0_var(--primary)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text)]",
                  )}
                  data-tab={one.key}
                  id={`${base}-${one.key}-tab`}
                  key={one.key}
                  onClick={() => choose(one.key)}
                  onKeyDown={onTabKey}
                  role="tab"
                  tabIndex={selected ? 0 : -1}
                  type="button"
                >
                  {one.label}
                  {one.count !== undefined ? (
                    <>
                      {" "}
                      <span className="rounded-[4px] bg-[var(--surface-muted)] px-1.5 text-[0.6875rem] font-medium text-[var(--text-muted)] tabular-nums">
                        {one.count}
                      </span>
                    </>
                  ) : null}
                </button>
              );
            })}
          </div>
          {tabs.map((one) => (
            <div
              aria-labelledby={`${base}-${one.key}-tab`}
              className="px-3.5 py-3 lg:pl-[46px]"
              hidden={one.key !== active?.key}
              id={`${base}-${one.key}`}
              key={one.key}
              role="tabpanel"
            >
              {one.content}
            </div>
          ))}
          {actions ? (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-[color-mix(in_srgb,var(--border)_60%,transparent)] bg-[var(--surface-subtle)] px-3.5 py-2 lg:pl-[46px]">
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
