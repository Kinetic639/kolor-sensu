import { Sprout, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "./badge";
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
        "sticky top-0 flex h-screen w-[var(--ks-sidebar-width)] flex-col overflow-y-auto border-r border-[var(--border)] bg-[var(--surface)] px-3 py-4",
        className,
      )}
    >
      <div className="flex items-center gap-3 px-2 py-1">
        <span className="flex size-9 items-center justify-center rounded-full bg-[var(--primary)] text-white">
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

      <nav className="mt-7 flex-1 space-y-5" aria-label="Nawigacja portalu">
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
                        "flex min-h-10 items-center gap-3 rounded-[var(--radius-control)] px-3 text-[0.8125rem] font-semibold text-[var(--text)] transition-colors hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
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

export interface MobileBottomNavProps {
  items: PortalNavigationItem[];
  className?: string;
}

export function MobileBottomNav({ items, className }: MobileBottomNavProps) {
  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 grid min-h-16 border-t border-[var(--border)] bg-[var(--surface)] px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgb(15_39_71/0.06)] md:hidden",
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
              "flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-[0.625rem] font-semibold text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none focus-visible:ring-inset",
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
        <main className="mx-auto w-full max-w-[var(--ks-container-xl)] p-3 pb-24 sm:p-5 lg:p-6 lg:pb-8">
          {children}
        </main>
      </div>
      {mobileNavigation}
    </div>
  );
}
