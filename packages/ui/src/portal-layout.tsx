import {
  Armchair,
  CalendarDays,
  Clock3,
  ContactRound,
  FileText,
  LayoutDashboard,
  Settings,
  Tags,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "./sidebar";

const portalIcons = {
  calendar: CalendarDays,
  clients: ContactRound,
  clock: Clock3,
  cms: FileText,
  dashboard: LayoutDashboard,
  rooms: Armchair,
  services: Tags,
  settings: Settings,
  specialist: UserRound,
  specialists: Users,
} satisfies Record<string, LucideIcon>;

export type PortalNavigationIcon = keyof typeof portalIcons;

export interface PortalNavigationItem {
  label: string;
  href: string;
  icon: PortalNavigationIcon;
  badge?: string | number;
  disabled?: boolean;
  active?: boolean;
}

export interface PortalNavigationSection {
  label?: string;
  items: PortalNavigationItem[];
}

export function isPortalPathActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export interface PortalBreadcrumb {
  label: string;
  href?: string;
}

/**
 * The header trail: the portal, then the navigation item the path is in
 * (the most specific one wins).
 */
export function portalBreadcrumbs(
  sections: PortalNavigationSection[],
  pathname: string,
  rootLabel: string,
): PortalBreadcrumb[] {
  const current = sections
    .flatMap((section) => section.items)
    .filter((item) => isPortalPathActive(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  if (!current) return [{ label: rootLabel }];
  return [{ label: rootLabel, href: "/" }, { label: current.label }];
}

export interface AppSidebarProps {
  sections: PortalNavigationSection[];
  currentPath?: string;
  brandName?: string;
  brandSubtitle?: string;
  footer?: ReactNode;
  className?: string;
}

export function AppSidebar({
  sections,
  currentPath,
  brandName = "Kolor Sensu",
  brandSubtitle = "Centrum Psychoterapii",
  footer,
  className,
}: AppSidebarProps) {
  return (
    <Sidebar className={className} collapsible="icon">
      {/* As tall as the main header (AppHeader), so their borders line up. */}
      <SidebarHeader
        className="h-[var(--ks-header-height)] shrink-0 justify-center border-b border-[var(--border)] px-3 py-0"
        data-portal-sidebar-header
      >
        <div className="flex items-center gap-3 overflow-hidden px-1 group-data-[collapsible=icon]/sidebar:justify-center group-data-[collapsible=icon]/sidebar:px-0">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-[var(--sidebar-border)] bg-[var(--sidebar-active)] text-sm font-bold text-white">
            KS
          </span>
          <span className="min-w-0 group-data-[collapsible=icon]/sidebar:hidden">
            <span className="block truncate text-base leading-tight font-bold text-white">
              {brandName}
            </span>
            <span className="block truncate text-[0.6875rem] font-semibold tracking-[0.06em] text-[var(--sidebar-accent)] uppercase">
              {brandSubtitle}
            </span>
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-3">
        <nav aria-label="Nawigacja portalu">
          {sections.map((section, sectionIndex) => (
            <SidebarGroup key={section.label ?? sectionIndex}>
              {section.label ? (
                <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
              ) : null}
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) => {
                    const Icon = portalIcons[item.icon];
                    const isActive = currentPath
                      ? isPortalPathActive(currentPath, item.href)
                      : item.active === true;

                    return (
                      <SidebarMenuItem key={item.href}>
                        {item.disabled ? (
                          <SidebarMenuButton
                            disabled
                            tooltip={`${item.label} — wkrótce`}
                          >
                            <Icon aria-hidden="true" />
                            <span className="group-data-[collapsible=icon]/sidebar:sr-only">
                              {item.label}
                            </span>
                          </SidebarMenuButton>
                        ) : (
                          <SidebarMenuButton
                            asChild
                            className="data-[active=true]:ring-1 data-[active=true]:ring-[rgb(52_211_153/0.4)]"
                            isActive={isActive}
                            tooltip={item.label}
                          >
                            <a
                              href={item.href}
                              aria-current={isActive ? "page" : undefined}
                            >
                              <Icon
                                aria-hidden="true"
                                className="text-[var(--sidebar-icon)]"
                              />
                              <span className="group-data-[collapsible=icon]/sidebar:sr-only">
                                {item.label}
                              </span>
                              {item.badge !== undefined ? (
                                <span className="ml-auto rounded border border-[var(--sidebar-border)] bg-[var(--sidebar-surface)] px-1.5 py-0.5 text-[0.625rem] leading-none font-semibold text-[var(--sidebar-accent)] group-data-[collapsible=icon]/sidebar:hidden">
                                  {item.badge}
                                </span>
                              ) : null}
                            </a>
                          </SidebarMenuButton>
                        )}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </nav>
      </SidebarContent>

      {footer ? (
        <SidebarFooter className="border-t border-[var(--border)]">
          {footer}
        </SidebarFooter>
      ) : null}
      <SidebarRail />
    </Sidebar>
  );
}

export interface MobileBottomNavProps {
  items: PortalNavigationItem[];
  currentPath?: string;
  className?: string;
}

export function MobileBottomNav({
  items,
  currentPath,
  className,
}: MobileBottomNavProps) {
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
        const Icon = portalIcons[item.icon];
        const isActive = currentPath
          ? isPortalPathActive(currentPath, item.href)
          : item.active === true;
        return (
          <a
            className={cn(
              "flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-[0.625rem] font-semibold text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none focus-visible:ring-inset",
              isActive && "text-[var(--primary)]",
            )}
            href={item.href}
            key={item.href}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="size-5" aria-hidden="true" />
            <span className="max-w-full truncate">{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
