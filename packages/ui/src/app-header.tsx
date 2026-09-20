"use client";

import { Bell, ChevronDown, Menu, Search, Sprout } from "lucide-react";
import type { ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Button } from "./button";
import { cn } from "./lib/utils";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "./sheet";

export interface AppHeaderUser {
  name: string;
  role: string;
  imageUrl?: string;
}

export interface AppHeaderProps {
  user: AppHeaderUser;
  searchPlaceholder?: string;
  systemStatus?: string;
  notificationCount?: number;
  tabletNavigation?: ReactNode;
  onMenuClick?: () => void;
  onNotificationsClick?: () => void;
  className?: string;
}

export function AppHeader({
  user,
  searchPlaceholder = "Szukaj klientów, wizyt, notatek...",
  systemStatus = "Wszystkie systemy działają",
  notificationCount = 0,
  tabletNavigation,
  onMenuClick,
  onNotificationsClick,
  className,
}: AppHeaderProps) {
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  return (
    <header
      className={cn(
        "flex h-[var(--ks-header-height)] items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-3 sm:px-5",
        className,
      )}
    >
      {tabletNavigation ? (
        <Sheet>
          <SheetTrigger asChild>
            <Button
              className="hidden md:inline-flex lg:hidden"
              size="icon"
              variant="ghost"
              aria-label="Otwórz nawigację"
              onClick={onMenuClick}
            >
              <Menu className="size-5" aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent
            className="w-[var(--ks-sidebar-width)] p-0 sm:max-w-[var(--ks-sidebar-width)]"
            side="left"
          >
            <SheetTitle className="sr-only">Nawigacja portalu</SheetTitle>
            <div className="h-full [&>aside]:static [&>aside]:h-full [&>aside]:w-full [&>aside]:border-r-0">
              {tabletNavigation}
            </div>
          </SheetContent>
        </Sheet>
      ) : onMenuClick ? (
        <Button
          className="hidden md:inline-flex lg:hidden"
          size="icon"
          variant="ghost"
          aria-label="Otwórz nawigację"
          onClick={onMenuClick}
        >
          <Menu className="size-5" aria-hidden="true" />
        </Button>
      ) : null}

      <div className="flex min-w-0 items-center gap-2.5 md:hidden">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-white">
          <Sprout className="size-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 leading-none">
          <span className="font-heading block truncate text-base font-semibold text-[var(--text)]">
            Kolor Sensu
          </span>
          <span className="mt-0.5 block truncate text-[0.55rem] text-[var(--text-muted)]">
            Centrum Psychoterapii
          </span>
        </span>
      </div>

      <label className="hidden h-9 max-w-md flex-1 items-center gap-2 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-subtle)] px-3 text-[var(--text-muted)] md:flex">
        <Search className="size-4" aria-hidden="true" />
        <span className="sr-only">Szukaj</span>
        <input
          className="min-w-0 flex-1 bg-transparent text-xs text-[var(--text)] outline-none placeholder:text-[var(--text-subtle)]"
          placeholder={searchPlaceholder}
          type="search"
        />
        <kbd className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5 text-[0.625rem] font-semibold">
          ⌘ K
        </kbd>
      </label>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2.5">
        <span className="hidden items-center gap-2 rounded-[var(--radius-control)] bg-[var(--success-soft)] px-3 py-2 text-[0.6875rem] font-semibold text-[var(--success)] xl:flex">
          <span className="size-2 rounded-full bg-[var(--success)]" />
          {systemStatus}
        </span>
        <Button
          className="relative"
          size="icon"
          variant="ghost"
          aria-label={`Powiadomienia${notificationCount ? ` (${notificationCount})` : ""}`}
          onClick={onNotificationsClick}
        >
          <Bell className="size-5" aria-hidden="true" />
          {notificationCount ? (
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[var(--danger)] ring-2 ring-white" />
          ) : null}
        </Button>
        <div
          className="hidden h-8 w-px bg-[var(--border)] sm:block"
          aria-hidden="true"
        />
        <Avatar className="size-9">
          {user.imageUrl ? <AvatarImage alt="" src={user.imageUrl} /> : null}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <span className="hidden min-w-0 sm:block">
          <span className="block max-w-36 truncate text-xs font-semibold text-[var(--text)]">
            {user.name}
          </span>
          <span className="block text-[0.6875rem] text-[var(--text-muted)]">
            {user.role}
          </span>
        </span>
        <ChevronDown
          className="hidden size-4 text-[var(--text-muted)] sm:block"
          aria-hidden="true"
        />
      </div>
    </header>
  );
}
