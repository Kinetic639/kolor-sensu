import {
  Armchair,
  CalendarCheck,
  CalendarDays,
  Clock3,
  ContactRound,
  FileText,
  LayoutDashboard,
  Mail,
  Megaphone,
  Settings,
  Tags,
  UserRound,
  Users,
  type LucideIcon,
  BookOpen,
  Newspaper,
} from "lucide-react";
import { Fragment, type ElementType, type ReactNode } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./breadcrumb";
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
  announcements: Megaphone,
  articles: Newspaper,
  ebooks: BookOpen,
  bookings: CalendarCheck,
  calendar: CalendarDays,
  clients: ContactRound,
  clock: Clock3,
  cms: FileText,
  dashboard: LayoutDashboard,
  emails: Mail,
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
 * The header trail: the dashboard, the section the path is in (the most
 * specific navigation item) and, on a detail page, what it shows
 * (`detail`, e.g. a room's name).
 */
export function portalBreadcrumbs(
  sections: PortalNavigationSection[],
  pathname: string,
  detail?: string | null,
): PortalBreadcrumb[] {
  const items = sections.flatMap((section) => section.items);
  const home = items.find((item) => item.href === "/")?.label ?? "Dashboard";
  if (pathname === "/") return [{ label: home }];

  const current = items
    .filter((item) => item.href !== "/")
    .filter((item) => isPortalPathActive(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  if (!current) return [{ label: home, href: "/" }];

  const trail: PortalBreadcrumb[] = [{ label: home, href: "/" }];
  if (detail && pathname !== current.href) {
    trail.push({ label: current.label, href: current.href });
    trail.push({ label: detail });
  } else {
    trail.push({ label: current.label });
  }
  return trail;
}

/**
 * The trail as links (all but the last, the current page). Renders on the
 * server; pass next/link as `linkAs` for client-side navigation.
 */
export function PortalBreadcrumbTrail({
  items,
  linkAs: Link = "a",
  className,
}: {
  items: PortalBreadcrumb[];
  linkAs?: ElementType;
  className?: string;
}) {
  if (!items.length) return null;
  return (
    <Breadcrumb className={cn("min-w-0", className)}>
      <BreadcrumbList className="flex-nowrap text-xs sm:gap-1.5">
        {items.map((crumb, index) => {
          const last = index === items.length - 1;
          return (
            <Fragment key={`${crumb.label}-${index}`}>
              <BreadcrumbItem className="min-w-0">
                {last ? (
                  <BreadcrumbPage className="truncate font-semibold text-[var(--primary)]">
                    {crumb.label}
                  </BreadcrumbPage>
                ) : crumb.href ? (
                  <BreadcrumbLink asChild className="truncate">
                    <Link href={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <span className="truncate">{crumb.label}</span>
                )}
              </BreadcrumbItem>
              {last ? null : <BreadcrumbSeparator />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
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
          <span className="flex size-7 shrink-0 items-center justify-center rounded-[6px] border border-[var(--sidebar-border)] bg-[var(--sidebar-active)] text-xs font-bold text-white">
            KS
          </span>
          <span className="min-w-0 group-data-[collapsible=icon]/sidebar:hidden">
            <span className="block truncate text-[0.875rem] leading-tight font-semibold text-white">
              {brandName}
            </span>
            <span className="block truncate text-[0.625rem] font-semibold tracking-[0.06em] text-[var(--sidebar-accent)] uppercase">
              {brandSubtitle}
            </span>
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-1.5">
        <nav aria-label="Nawigacja portalu">
          {sections.map((section, sectionIndex) => (
            <SidebarGroup key={section.label ?? sectionIndex}>
              {section.label ? (
                <SidebarGroupLabel
                  // Collapsed, a line between groups; none above the first.
                  className={
                    sectionIndex === 0
                      ? "group-data-[collapsible=icon]/sidebar:hidden"
                      : undefined
                  }
                >
                  {section.label}
                </SidebarGroupLabel>
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
                            className="data-[active=true]:shadow-none"
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
