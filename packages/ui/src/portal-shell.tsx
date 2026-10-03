"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AppHeader, type AppHeaderProps } from "./app-header";
import {
  AppSidebar,
  MobileBottomNav,
  portalBreadcrumbs,
  type PortalNavigationItem,
  type PortalNavigationSection,
} from "./portal-layout";
import { NotificationsProvider } from "./notifications/context";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "./sidebar";

export interface PortalShellProps {
  navigation: PortalNavigationSection[];
  mobileNavigation: PortalNavigationItem[];
  user: AppHeaderProps["user"];
  children: ReactNode;
  brandSubtitle: string;
  defaultSidebarOpen?: boolean;
  notificationCount?: number;
  /** The bell; see `AppHeader`. */
  notifications?: ReactNode;
  /**
   * The notifications drawer (it slides in over the page); it and the bell
   * share what is open (`NotificationsProvider`).
   */
  notificationsPanel?: ReactNode;
  profileHref?: string;
  portalSwitch?: AppHeaderProps["portalSwitch"];
  logoutAction?: AppHeaderProps["logoutAction"];
  /**
   * The trail, rendered on the server (e.g. a `@breadcrumb` parallel route
   * that knows a detail page's name). Without it, it follows the path.
   */
  breadcrumbs?: ReactNode;
  /** The colour theme (from the cookie), switched in the user menu. */
  theme?: AppHeaderProps["theme"];
}

export function PortalShell({
  navigation,
  mobileNavigation,
  user,
  children,
  brandSubtitle,
  defaultSidebarOpen = true,
  notificationCount = 0,
  notifications,
  notificationsPanel,
  profileHref,
  portalSwitch,
  logoutAction,
  breadcrumbs,
  theme,
}: PortalShellProps) {
  const pathname = usePathname();
  return (
    <NotificationsProvider>
      <SidebarProvider defaultOpen={defaultSidebarOpen}>
        <AppSidebar
          brandSubtitle={brandSubtitle}
          currentPath={pathname}
          sections={navigation}
        />
        <SidebarInset>
          <div className="sticky top-0 z-30">
            <AppHeader
              breadcrumbTrail={breadcrumbs}
              breadcrumbs={portalBreadcrumbs(navigation, pathname)}
              logoutAction={logoutAction}
              navigationTrigger={
                <SidebarTrigger className="hidden md:inline-flex" />
              }
              notificationCount={notificationCount}
              notifications={notifications}
              portalSwitch={portalSwitch}
              profileHref={profileHref}
              theme={theme}
              user={user}
            />
          </div>
          {/* A page marked data-full-bleed (a table, a calendar) fills the space
            to the edges; the others keep a margin and a reading width. */}
          <main className="mx-auto w-full max-w-[var(--ks-container-xl)] flex-1 p-3 pb-24 has-[[data-full-bleed]]:max-w-none has-[[data-full-bleed]]:p-0 has-[[data-full-bleed]]:pb-16 sm:p-4 md:pb-6 md:has-[[data-full-bleed]]:pb-0">
            {children}
          </main>
          {notificationsPanel}
        </SidebarInset>
        <MobileBottomNav currentPath={pathname} items={mobileNavigation} />
      </SidebarProvider>
    </NotificationsProvider>
  );
}
