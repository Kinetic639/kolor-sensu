"use client";

import { ArrowRight, ChevronRight } from "lucide-react";
import { PageLink as Link } from "./page-link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "../lib/utils";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "../navigation-menu";
import type { SiteNavChild, SiteNavItem } from "./site-types";

// Desktop navigation (shadcn NavigationMenu, restyled for the public site):
// plain links, and a dropdown for items with children ("Oferta"): its
// pages one under another, and its groups (the offer's catalogues), each
// opening its own pages in a column beside it (pointed at, clicked, or
// with the right arrow; the left arrow goes back). A client component only
// for the dropdown's keyboard and pointer handling; the links themselves
// are in the server HTML.

export function isCurrent(href: string, currentPath?: string) {
  if (!currentPath) return false;
  return href === "/"
    ? currentPath === "/"
    : currentPath === href || currentPath.startsWith(`${href}/`);
}

const itemStyle =
  "text-small text-ink inline-flex h-10 items-center rounded-full px-3.5 font-medium transition-colors hover:bg-cream focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2 data-[active=true]:text-primary-strong aria-[current=page]:text-primary-strong";

const rowStyle =
  "hover:bg-cream focus-visible:outline-ring rounded-card text-small text-ink flex w-full flex-row items-center justify-between gap-3 px-3 py-2.5 text-left font-medium focus-visible:outline-2 aria-[current=page]:text-primary-strong";

export interface SiteNavigationProps {
  items: readonly SiteNavItem[];
  /** The page's path; by default the router's current path. */
  currentPath?: string;
  className?: string;
}

/** A dropdown's list, and the group open beside it. */
function DropdownList({
  item,
  currentPath,
}: {
  item: SiteNavItem;
  currentPath?: string;
}) {
  const base = useId();
  const [open, setOpen] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const triggers = useRef(new Map<string, HTMLButtonElement>());
  const children = item.children ?? [];
  const group = children.find((child) => child.href === open);

  // Opened from the keyboard: its first page takes the focus once shown.
  const focusPanel = useRef(false);
  useEffect(() => {
    if (!open || !focusPanel.current) return;
    focusPanel.current = false;
    panel.current?.querySelector<HTMLAnchorElement>("a")?.focus();
  }, [open]);
  const onGroupKey = (
    event: KeyboardEvent<HTMLButtonElement>,
    child: SiteNavChild,
  ) => {
    if (event.key !== "ArrowRight") return;
    event.preventDefault();
    // The menu's own arrows would move on to the next top item.
    event.stopPropagation();
    focusPanel.current = true;
    setOpen(child.href);
  };
  const onPanelKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" || !open) return;
    event.preventDefault();
    event.stopPropagation();
    triggers.current.get(open)?.focus();
    setOpen(null);
  };

  return (
    <div className="flex items-stretch">
      <div className="grid w-[18rem] content-start gap-1">
        <ul className="grid gap-0.5">
          {children.map((child) => (
            <li key={child.href}>
              {child.children?.length ? (
                <button
                  aria-controls={`${base}-panel`}
                  aria-expanded={open === child.href}
                  className={cn(
                    rowStyle,
                    open === child.href && "bg-cream text-primary-strong",
                  )}
                  // Pointed at, it is open already: a click keeps it so.
                  onClick={() => setOpen(child.href)}
                  onKeyDown={(event) => onGroupKey(event, child)}
                  onPointerEnter={() => setOpen(child.href)}
                  ref={(node) => {
                    if (node) triggers.current.set(child.href, node);
                    else triggers.current.delete(child.href);
                  }}
                  type="button"
                >
                  {child.label}
                  <ChevronRight
                    aria-hidden="true"
                    className="size-4 shrink-0"
                    strokeWidth={1.75}
                  />
                </button>
              ) : (
                <NavigationMenuLink
                  active={isCurrent(child.href, currentPath)}
                  asChild
                >
                  <Link
                    className={rowStyle}
                    href={child.href}
                    onPointerEnter={() => setOpen(null)}
                  >
                    {child.label}
                  </Link>
                </NavigationMenuLink>
              )}
            </li>
          ))}
        </ul>
        {item.links?.length ? (
          <ul className="grid gap-0.5">
            {item.links.map((link) => (
              <li key={link.href}>
                <NavigationMenuLink
                  active={isCurrent(link.href, currentPath)}
                  asChild
                >
                  <Link
                    className={rowStyle}
                    href={link.href}
                    onPointerEnter={() => setOpen(null)}
                  >
                    {link.label}
                  </Link>
                </NavigationMenuLink>
              </li>
            ))}
          </ul>
        ) : null}
        {/* The item's own page, set apart from its list. */}
        <div className="border-border/70 mt-1 border-t pt-1">
          <NavigationMenuLink asChild>
            <Link
              href={item.href}
              className="text-small text-ink hover:bg-cream group/all flex-row items-center gap-1.5 rounded-full px-3 py-2 font-semibold"
            >
              {item.allLabel ?? `Cała ${item.label.toLowerCase()}`}
              <ArrowRight
                aria-hidden="true"
                className="ease-soft size-3.5 transition-transform group-hover/all:translate-x-0.5"
                strokeWidth={1.75}
              />
            </Link>
          </NavigationMenuLink>
        </div>
      </div>
      <div
        aria-label={group?.label}
        className={cn(
          "border-border/70 ml-2 grid w-[18rem] content-start gap-1 border-l pl-2",
          !group && "hidden",
        )}
        id={`${base}-panel`}
        // Before the links' own arrows (Radix moves between them).
        onKeyDownCapture={onPanelKey}
        ref={panel}
        role="group"
      >
        {group ? (
          <>
            <p className="text-eyebrow text-text-muted px-3 pt-2.5 pb-1 uppercase">
              {group.label}
            </p>
            <ul className="grid gap-0.5">
              {(group.children ?? []).map((link) => (
                <li key={link.href}>
                  <NavigationMenuLink
                    active={isCurrent(link.href, currentPath)}
                    asChild
                  >
                    <Link className={rowStyle} href={link.href}>
                      {link.label}
                    </Link>
                  </NavigationMenuLink>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </div>
  );
}

export function SiteNavigation({
  items,
  currentPath: givenPath,
  className,
}: SiteNavigationProps) {
  // Outside a Next.js router (tests) usePathname() is null.
  const pathname = usePathname();
  const currentPath = givenPath ?? pathname ?? undefined;
  return (
    <NavigationMenu
      viewport={false}
      aria-label="Główna"
      className={cn("ks-site-nav", className)}
    >
      <NavigationMenuList className="gap-0.5">
        {items.map((item) => {
          // A dropdown is current on its own page and on any of its pages.
          const active =
            isCurrent(item.href, currentPath) ||
            (item.links ?? []).some((link) =>
              isCurrent(link.href, currentPath),
            ) ||
            (item.children ?? []).some(
              (child) =>
                isCurrent(child.href, currentPath) ||
                (child.children ?? []).some((link) =>
                  isCurrent(link.href, currentPath),
                ),
            );
          return item.children?.length ? (
            <NavigationMenuItem key={item.href}>
              <NavigationMenuTrigger
                data-active={active}
                className={cn(
                  itemStyle,
                  "data-[state=open]:bg-cream hover:bg-cream h-10 bg-transparent py-0",
                )}
              >
                {item.label}
              </NavigationMenuTrigger>
              <NavigationMenuContent className="bg-surface border-border/70 shadow-card-hover rounded-card-lg! p-3! md:w-auto">
                <DropdownList currentPath={currentPath} item={item} />
              </NavigationMenuContent>
            </NavigationMenuItem>
          ) : (
            <NavigationMenuItem key={item.href}>
              <NavigationMenuLink asChild active={active}>
                <Link
                  href={item.href}
                  className={cn(itemStyle, "flex-row p-0 px-3.5")}
                >
                  {item.label}
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          );
        })}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
