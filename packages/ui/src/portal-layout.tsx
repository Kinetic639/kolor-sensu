import {
  BedDouble,
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
import { Badge } from "./badge";
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
  rooms: BedDouble,
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
      <SidebarHeader className="border-b border-[var(--border)] px-3 py-4">
        <div className="flex min-h-10 items-center gap-3 overflow-hidden px-1 group-data-[collapsible=icon]/sidebar:justify-center group-data-[collapsible=icon]/sidebar:px-0">
          <span className="font-heading flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-semibold text-white">
            KS
          </span>
          <span className="min-w-0 group-data-[collapsible=icon]/sidebar:hidden">
            <span className="font-heading block truncate text-lg leading-tight font-semibold text-[var(--text)]">
              {brandName}
            </span>
            <span className="block truncate text-[0.6875rem] text-[var(--text-muted)]">
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
                            <span className="group-data-[collapsible=icon]/sidebar:hidden">
                              {item.label}
                            </span>
                          </SidebarMenuButton>
                        ) : (
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            tooltip={item.label}
                          >
                            <a
                              href={item.href}
                              aria-current={isActive ? "page" : undefined}
                            >
                              <Icon aria-hidden="true" />
                              <span className="group-data-[collapsible=icon]/sidebar:hidden">
                                {item.label}
                              </span>
                              {item.badge !== undefined ? (
                                <Badge
                                  className="ml-auto group-data-[collapsible=icon]/sidebar:hidden"
                                  variant={isActive ? "primary" : "neutral"}
                                >
                                  {item.badge}
                                </Badge>
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
