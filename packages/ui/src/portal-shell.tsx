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
import { SidebarInset, SidebarProvider, SidebarTrigger } from "./sidebar";

export interface PortalShellProps {
  navigation: PortalNavigationSection[];
  mobileNavigation: PortalNavigationItem[];
  user: AppHeaderProps["user"];
  children: ReactNode;
  brandSubtitle: string;
  defaultSidebarOpen?: boolean;
  notificationCount?: number;
  profileHref?: string;
  portalSwitch?: AppHeaderProps["portalSwitch"];
  logoutAction?: AppHeaderProps["logoutAction"];
  /**
   * The trail, rendered on the server (e.g. a `@breadcrumb` parallel route
   * that knows a detail page's name). Without it, it follows the path.
   */
  breadcrumbs?: ReactNode;
}

export function PortalShell({
  navigation,
  mobileNavigation,
  user,
  children,
  brandSubtitle,
  defaultSidebarOpen = true,
  notificationCount = 0,
  profileHref,
  portalSwitch,
  logoutAction,
  breadcrumbs,
}: PortalShellProps) {
  const pathname = usePathname();
  return (
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
            portalSwitch={portalSwitch}
            profileHref={profileHref}
            user={user}
          />
        </div>
        <main className="mx-auto w-full max-w-[var(--ks-container-xl)] flex-1 p-3 pb-24 sm:p-5 md:pb-8 lg:p-6">
          {children}
        </main>
      </SidebarInset>
      <MobileBottomNav currentPath={pathname} items={mobileNavigation} />
    </SidebarProvider>
  );
}
