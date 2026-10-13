"use client";

import {
  ArrowLeftRight,
  Bell,
  ChevronDown,
  LogOut,
  Monitor,
  Moon,
  Sprout,
  Sun,
  UserRound,
} from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Button } from "./button";
import { PortalBreadcrumbTrail } from "./portal-layout";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { cn } from "./lib/utils";
import { applyTheme, THEME_LABELS, THEMES, type Theme } from "./theme";

const THEME_ICONS = { light: Sun, dark: Moon, system: Monitor };

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
  /** The bell with its inbox (e.g. `PortalNotifications`); wins over the plain bell. */
  notifications?: ReactNode;
  /** The colour theme (from the cookie); given, the menu can switch it. */
  theme?: Theme;
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
  notifications,
  theme,
  className,
}: AppHeaderProps) {
  const [currentTheme, setCurrentTheme] = useState(theme);
  // The logout form lives outside the menu: the menu unmounts its items as
  // it closes, before a form inside would be submitted.
  const logoutForm = useRef<HTMLFormElement>(null);
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
  const hasUserMenu = Boolean(
    profileHref || portalSwitch || logoutAction || theme,
  );

  const userIdentity = (
    <>
      <Avatar className="size-7">
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
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)]">
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
        {notifications ?? (
          <Button
            className="relative"
            size="icon"
            variant="ghost"
            aria-label={`Powiadomienia${notificationCount ? ` (${notificationCount})` : ""}`}
            onClick={onNotificationsClick}
          >
            <Bell className="size-5" aria-hidden="true" />
            {notificationCount ? (
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[var(--danger)] ring-2 ring-[var(--surface)]" />
            ) : null}
          </Button>
        )}
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
              {currentTheme ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs font-medium text-[var(--text-muted)]">
                    Motyw
                  </DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={currentTheme}
                    onValueChange={(value) => {
                      const next = value as Theme;
                      applyTheme(next);
                      setCurrentTheme(next);
                    }}
                  >
                    {THEMES.map((option) => {
                      const Icon = THEME_ICONS[option];
                      return (
                        <DropdownMenuRadioItem key={option} value={option}>
                          <Icon className="size-4" aria-hidden="true" />
                          {THEME_LABELS[option]}
                        </DropdownMenuRadioItem>
                      );
                    })}
                  </DropdownMenuRadioGroup>
                </>
              ) : null}
              {logoutAction ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => logoutForm.current?.requestSubmit()}
                  >
                    <LogOut className="size-4" aria-hidden="true" />
                    Wyloguj się
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-2">{userIdentity}</div>
        )}
        {logoutAction ? (
          <form action={logoutAction} hidden ref={logoutForm} />
        ) : null}
      </div>
    </header>
  );
}
