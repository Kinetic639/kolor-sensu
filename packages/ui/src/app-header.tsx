"use client";

import {
  ArrowLeftRight,
  Bell,
  ChevronDown,
  LogOut,
  Sprout,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Button } from "./button";
import { PortalBreadcrumbTrail } from "./portal-layout";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { cn } from "./lib/utils";

export interface AppHeaderUser {
  name: string;
  role: string;
  email?: string;
  imageUrl?: string;
}

export interface PortalSwitchLink {
  label: string;
  href: string;
}

export interface AppHeaderProps {
  user: AppHeaderUser;
  /** Where the user is: the dashboard, then the page (the last is current). */
  breadcrumbs?: { label: string; href?: string }[];
  /** A trail rendered elsewhere (e.g. on the server); wins over `breadcrumbs`. */
  breadcrumbTrail?: ReactNode;
  notificationCount?: number;
  navigationTrigger?: ReactNode;
  profileHref?: string;
  portalSwitch?: PortalSwitchLink;
  logoutAction?: (formData: FormData) => void | Promise<void>;
  onNotificationsClick?: () => void;
  className?: string;
}

export function AppHeader({
  user,
  breadcrumbs = [],
  breadcrumbTrail,
  notificationCount = 0,
  navigationTrigger,
  profileHref,
  portalSwitch,
  logoutAction,
  onNotificationsClick,
  className,
}: AppHeaderProps) {
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
  const hasUserMenu = Boolean(profileHref || portalSwitch || logoutAction);

  const userIdentity = (
    <>
      <Avatar className="size-9">
        {user.imageUrl ? <AvatarImage alt="" src={user.imageUrl} /> : null}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <span className="hidden min-w-0 text-left sm:block">
        <span className="block max-w-36 truncate text-xs font-semibold text-[var(--text)]">
          {user.name}
        </span>
        <span className="block text-[0.6875rem] text-[var(--text-muted)]">
          {user.role}
        </span>
      </span>
      {hasUserMenu ? (
        <ChevronDown
          className="hidden size-4 text-[var(--text-muted)] sm:block"
          aria-hidden="true"
        />
      ) : null}
    </>
  );

  return (
    <header
      className={cn(
        "flex h-[var(--ks-header-height)] items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-3 sm:px-5",
        className,
      )}
    >
      {navigationTrigger}

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

      <div className="hidden min-w-0 md:block">
        {breadcrumbTrail ?? <PortalBreadcrumbTrail items={breadcrumbs} />}
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2.5">
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
        {hasUserMenu ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="h-auto gap-2 px-1.5 py-1 hover:bg-[var(--surface-muted)]"
                variant="ghost"
                aria-label="Menu użytkownika"
              >
                {userIdentity}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <span className="block text-[var(--text)]">{user.name}</span>
                {user.email ? (
                  <span className="mt-0.5 block font-normal text-[var(--text-muted)]">
                    {user.email}
                  </span>
                ) : null}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {profileHref ? (
                <DropdownMenuItem asChild>
                  <a href={profileHref}>
                    <UserRound className="size-4" aria-hidden="true" />
                    Profil i konto
                  </a>
                </DropdownMenuItem>
              ) : null}
              {portalSwitch ? (
                <DropdownMenuItem asChild>
                  <a href={portalSwitch.href}>
                    <ArrowLeftRight className="size-4" aria-hidden="true" />
                    {portalSwitch.label}
                  </a>
                </DropdownMenuItem>
              ) : null}
              {logoutAction ? (
                <>
                  <DropdownMenuSeparator />
                  <form action={logoutAction}>
                    <DropdownMenuItem asChild>
                      <button className="w-full" type="submit">
                        <LogOut className="size-4" aria-hidden="true" />
                        Wyloguj się
                      </button>
                    </DropdownMenuItem>
                  </form>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-2">{userIdentity}</div>
        )}
      </div>
    </header>
  );
}
