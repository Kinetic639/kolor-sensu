import { Menu } from "lucide-react";
import Link from "next/link";
import { Button } from "./button";
import { Container } from "./container";
import { cn } from "./lib/utils";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";

export interface PublicNavigationItem {
  label: string;
  href: string;
}

export function isPublicPathActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function BrandMark({
  brandName,
  brandSubtitle,
}: {
  brandName: string;
  brandSubtitle: string;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className="font-heading flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-semibold text-white">
        KS
      </span>
      <span className="min-w-0 leading-none">
        <span className="font-heading block truncate text-base font-semibold text-[var(--text)]">
          {brandName}
        </span>
        <span className="mt-0.5 hidden truncate text-[0.6875rem] text-[var(--text-muted)] sm:block">
          {brandSubtitle}
        </span>
      </span>
    </span>
  );
}

export interface PublicSiteHeaderProps {
  navigation: PublicNavigationItem[];
  currentPath?: string;
  brandName?: string;
  brandSubtitle?: string;
}

export function PublicSiteHeader({
  navigation,
  currentPath,
  brandName = "Kolor Sensu",
  brandSubtitle = "Centrum Psychoterapii",
}: PublicSiteHeaderProps) {
  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]">
      <Container className="flex h-[var(--ks-header-height)] items-center justify-between gap-4">
        <Link aria-label="Kolor Sensu — strona główna" href="/">
          <BrandMark brandName={brandName} brandSubtitle={brandSubtitle} />
        </Link>

        <nav aria-label="Nawigacja główna" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {navigation.map((item) => {
              const isActive = currentPath
                ? isPublicPathActive(currentPath, item.href)
                : false;
              return (
                <li key={item.href}>
                  <a
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "inline-flex items-center rounded-[var(--radius-control)] px-3 py-2 text-sm font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
                      isActive &&
                        "text-[var(--primary)] underline decoration-2 underline-offset-4",
                    )}
                    href={item.href}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <Sheet>
          <SheetTrigger asChild>
            <Button
              aria-label="Otwórz menu nawigacji"
              className="md:hidden"
              size="icon"
              variant="ghost"
            >
              <Menu aria-hidden="true" className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>{brandName}</SheetTitle>
              <SheetDescription className="sr-only">
                Lista stron dostępnych w serwisie Kolor Sensu.
              </SheetDescription>
            </SheetHeader>
            <nav aria-label="Nawigacja mobilna" className="mt-6">
              <ul className="flex flex-col gap-1">
                {navigation.map((item) => {
                  const isActive = currentPath
                    ? isPublicPathActive(currentPath, item.href)
                    : false;
                  return (
                    <li key={item.href}>
                      <SheetClose asChild>
                        <a
                          aria-current={isActive ? "page" : undefined}
                          className={cn(
                            "flex min-h-11 items-center rounded-[var(--radius-control)] px-3 text-base font-semibold text-[var(--text)] hover:bg-[var(--surface-muted)]",
                            isActive &&
                              "bg-[var(--primary-soft)] text-[var(--primary)]",
                          )}
                          href={item.href}
                        >
                          {item.label}
                        </a>
                      </SheetClose>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </SheetContent>
        </Sheet>
      </Container>
    </header>
  );
}

export interface PublicSiteFooterCenterProfile {
  publicEmail: string | null;
  publicPhone: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
}

export interface PublicSiteFooterProps {
  navigation: PublicNavigationItem[];
  brandName?: string;
  centerProfile?: PublicSiteFooterCenterProfile | null;
}

export function PublicSiteFooter({
  navigation,
  brandName = "Kolor Sensu",
  centerProfile,
}: PublicSiteFooterProps) {
  const year = new Date().getFullYear();
  const contactLinks = centerProfile
    ? ([
        centerProfile.publicEmail
          ? {
              label: centerProfile.publicEmail,
              href: `mailto:${centerProfile.publicEmail}`,
            }
          : null,
        centerProfile.publicPhone
          ? {
              label: centerProfile.publicPhone,
              href: `tel:${centerProfile.publicPhone}`,
            }
          : null,
        centerProfile.websiteUrl
          ? { label: centerProfile.websiteUrl, href: centerProfile.websiteUrl }
          : null,
        centerProfile.instagramUrl
          ? { label: "Instagram", href: centerProfile.instagramUrl }
          : null,
        centerProfile.facebookUrl
          ? { label: "Facebook", href: centerProfile.facebookUrl }
          : null,
      ].filter(Boolean) as { label: string; href: string }[])
    : [];

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface-subtle)]">
      <Container className="flex flex-col gap-6 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-heading text-lg font-semibold text-[var(--text)]">
            {brandName}
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            &copy; {year} {brandName}. Wszelkie prawa zastrzeżone.
          </p>
        </div>

        <nav aria-label="Nawigacja w stopce">
          <ul className="flex flex-col gap-2 sm:flex-row sm:gap-5">
            {navigation.map((item) => (
              <li key={item.href}>
                <a
                  className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                  href={item.href}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {contactLinks.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {contactLinks.map((link) => (
              <li key={link.href}>
                <a
                  className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                  href={link.href}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </Container>
    </footer>
  );
}
