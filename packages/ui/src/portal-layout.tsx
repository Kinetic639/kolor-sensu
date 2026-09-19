"use client";

import {
  Bell,
  ChevronDown,
  Menu,
  Search,
  Sprout,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Badge } from "./badge";
import { Button } from "./button";
import { cn } from "./lib/utils";

export interface PortalNavigationItem {
  label: string;
  href: string;
  icon: LucideIcon;
  active?: boolean;
  badge?: string | number;
}

export interface PortalNavigationSection {
  label?: string;
  items: PortalNavigationItem[];
}

export interface AppSidebarProps {
  sections: PortalNavigationSection[];
  brandName?: string;
  brandSubtitle?: string;
  footer?: ReactNode;
  className?: string;
}

export function AppSidebar({
  sections,
  brandName = "Kolor Sensu",
  brandSubtitle = "Centrum Psychoterapii",
  footer,
  className,
}: AppSidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-full min-h-screen w-[var(--ks-sidebar-width)] flex-col border-r border-[var(--border)] bg-[var(--surface)] px-4 py-5",
        className,
      )}
    >
      <div className="flex items-center gap-3 px-2">
        <span className="flex size-10 items-center justify-center rounded-full bg-[var(--primary)] text-white">
          <Sprout className="size-5" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="font-heading block truncate text-lg leading-tight font-semibold text-[var(--text)]">
            {brandName}
          </span>
          <span className="block truncate text-xs text-[var(--text-muted)]">
            {brandSubtitle}
          </span>
        </span>
      </div>

      <nav className="mt-8 flex-1 space-y-6" aria-label="Nawigacja portalu">
        {sections.map((section, sectionIndex) => (
          <div key={section.label ?? sectionIndex}>
            {section.label ? (
              <p className="mb-2 px-3 text-[0.6875rem] font-bold tracking-[0.08em] text-[var(--text-muted)] uppercase">
                {section.label}
              </p>
            ) : null}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.label}>
                    <a
                      className={cn(
                        "flex min-h-10 items-center gap-3 rounded-[var(--radius-control)] px-3 text-sm font-semibold text-[var(--text)] transition-colors hover:bg-[var(--surface-muted)]",
                        item.active &&
                          "bg-[var(--primary)] text-white shadow-sm hover:bg-[var(--primary-hover)]",
                      )}
                      href={item.href}
                      aria-current={item.active ? "page" : undefined}
                    >
                      <Icon className="size-[1.125rem]" aria-hidden="true" />
                      <span className="flex-1">{item.label}</span>
                      {item.badge !== undefined ? (
                        <Badge
                          className={cn(
                            item.active &&
                              "bg-white/18 text-white ring-1 ring-white/30",
                          )}
                          variant={item.active ? "primary" : "neutral"}
                        >
                          {item.badge}
                        </Badge>
                      ) : null}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {footer ? <div className="mt-6">{footer}</div> : null}
    </aside>
  );
}

export interface AppHeaderProps {
  userName: string;
  userRole: string;
  userImageUrl?: string;
  searchPlaceholder?: string;
  systemStatus?: string;
  notificationCount?: number;
  onMenuClick?: () => void;
  onNotificationsClick?: () => void;
  className?: string;
}

export function AppHeader({
  userName,
  userRole,
  userImageUrl,
  searchPlaceholder = "Szukaj klientów, wizyt, notatek...",
  systemStatus = "Wszystkie systemy działają",
  notificationCount = 0,
  onMenuClick,
  onNotificationsClick,
  className,
}: AppHeaderProps) {
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  return (
    <header
      className={cn(
        "flex h-[var(--ks-header-height)] items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 sm:px-6",
        className,
      )}
    >
      <Button
        className="lg:hidden"
        size="icon"
        variant="ghost"
        aria-label="Otwórz nawigację"
        onClick={onMenuClick}
      >
        <Menu className="size-5" aria-hidden="true" />
      </Button>

      <label className="hidden h-10 max-w-md flex-1 items-center gap-2 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-subtle)] px-3 text-[var(--text-muted)] md:flex">
        <Search className="size-4" aria-hidden="true" />
        <span className="sr-only">Szukaj</span>
        <input
          className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-subtle)]"
          placeholder={searchPlaceholder}
          type="search"
        />
        <kbd className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5 text-[0.625rem] font-semibold">
          ⌘ K
        </kbd>
      </label>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <span className="hidden items-center gap-2 rounded-full bg-[var(--success-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--success)] xl:flex">
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
        <div className="h-8 w-px bg-[var(--border)]" aria-hidden="true" />
        <Avatar>
          {userImageUrl ? <AvatarImage alt="" src={userImageUrl} /> : null}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <span className="hidden min-w-0 sm:block">
          <span className="block max-w-36 truncate text-sm font-semibold text-[var(--text)]">
            {userName}
          </span>
          <span className="block text-xs text-[var(--text-muted)]">
            {userRole}
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

export interface MobileBottomNavProps {
  items: PortalNavigationItem[];
  className?: string;
}

export function MobileBottomNav({ items, className }: MobileBottomNavProps) {
  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 grid min-h-16 border-t border-[var(--border)] bg-[var(--surface)] px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgb(15_39_71/0.06)] lg:hidden",
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      aria-label="Nawigacja mobilna"
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <a
            className={cn(
              "flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-[0.6875rem] font-semibold text-[var(--text-muted)]",
              item.active && "text-[var(--primary)]",
            )}
            href={item.href}
            key={item.label}
            aria-current={item.active ? "page" : undefined}
          >
            <Icon className="size-5" aria-hidden="true" />
            <span className="max-w-full truncate">{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}

export interface AppShellProps {
  sidebar: ReactNode;
  header: ReactNode;
  mobileNavigation?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function AppShell({
  sidebar,
  header,
  mobileNavigation,
  children,
  className,
}: AppShellProps) {
  return (
    <div
      className={cn(
        "min-h-screen bg-[var(--background)] text-[var(--text)] lg:grid lg:grid-cols-[var(--ks-sidebar-width)_minmax(0,1fr)]",
        className,
      )}
    >
      <div className="hidden lg:block">{sidebar}</div>
      <div className="min-w-0">
        <div className="sticky top-0 z-30">{header}</div>
        <main className="mx-auto w-full max-w-[var(--ks-container-xl)] p-4 pb-24 sm:p-6 lg:p-8 lg:pb-8">
          {children}
        </main>
      </div>
      {mobileNavigation}
    </div>
  );
}
