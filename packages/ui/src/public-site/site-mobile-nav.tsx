"use client";

import { Mail, Menu, Phone } from "lucide-react";
import { PageLink as Link } from "./page-link";
import { usePathname } from "next/navigation";
import { cn } from "../lib/utils";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "../sheet";
import { PrimaryButton } from "./actions";
import { SiteLogo } from "./site-logo";
import { isCurrent } from "./site-navigation";
import type { SiteContact, SiteLink, SiteNavItem } from "./site-types";

// Phones and tablets: a round menu button opening a full-height sheet
// (shadcn Sheet, restyled: paper, no blur behind it) with the navigation in
// the display serif, the booking action and the contact details. Every link
// closes the sheet.

export interface SiteMobileNavProps {
  items: readonly SiteNavItem[];
  cta?: SiteLink;
  contact?: SiteContact;
  /** The page's path; by default the router's current path. */
  currentPath?: string;
  className?: string;
}

export function SiteMobileNav({
  items,
  cta,
  contact,
  currentPath: givenPath,
  className,
}: SiteMobileNavProps) {
  // Outside a Next.js router (tests) usePathname() is null.
  const pathname = usePathname();
  const currentPath = givenPath ?? pathname ?? undefined;
  return (
    <Sheet>
      <SheetTrigger
        className={cn(
          "border-border-strong/60 text-ink hover:bg-cream focus-visible:outline-ring grid size-11 place-items-center rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
          className,
        )}
        aria-label="Otwórz menu"
      >
        <Menu className="size-5" strokeWidth={1.75} aria-hidden="true" />
      </SheetTrigger>
      <SheetContent
        side="right"
        overlayClassName="bg-ink/35 backdrop-blur-none"
        className="bg-bg text-ink border-border/70 flex w-full flex-col gap-8 p-0 shadow-none sm:max-w-sm [&>button:last-child]:top-6 [&>button:last-child]:right-5 [&>button:last-child]:rounded-full [&>button:last-child]:p-2.5"
      >
        <div className="px-6 pt-5">
          <SiteLogo />
        </div>
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SheetDescription className="sr-only">
          Nawigacja po stronie Kolor Sensu
        </SheetDescription>
        <nav aria-label="Główna" className="px-6">
          <ul className="grid gap-1">
            {items.map((item) => {
              const active = isCurrent(item.href, currentPath);
              return (
                <li key={item.href}>
                  <SheetClose asChild>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "font-display text-h3 hover:text-primary block py-1.5 transition-colors",
                        active && "text-primary",
                      )}
                    >
                      {item.label}
                    </Link>
                  </SheetClose>
                  {item.children?.length ? (
                    <ul className="border-border mb-2 ml-1 grid gap-0.5 border-l pl-4">
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <SheetClose asChild>
                            <Link
                              href={child.href}
                              aria-current={
                                isCurrent(child.href, currentPath)
                                  ? "page"
                                  : undefined
                              }
                              className="text-small text-text-muted hover:text-ink block py-1.5"
                            >
                              {child.label}
                            </Link>
                          </SheetClose>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="border-border mt-auto grid gap-5 border-t px-6 pt-6 pb-8">
          {cta ? (
            <SheetClose asChild>
              <PrimaryButton asChild arrow className="w-full">
                <Link href={cta.href}>{cta.label}</Link>
              </PrimaryButton>
            </SheetClose>
          ) : null}
          {contact?.phone || contact?.email ? (
            <ul className="text-small grid gap-2">
              {contact.phone ? (
                <li>
                  <a
                    href={`tel:${contact.phone}`}
                    className="hover:text-primary-strong inline-flex items-center gap-2.5"
                  >
                    <Phone
                      className="text-primary size-4"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                    {contact.phoneLabel ?? contact.phone}
                  </a>
                </li>
              ) : null}
              {contact.email ? (
                <li>
                  <a
                    href={`mailto:${contact.email}`}
                    className="hover:text-primary-strong inline-flex items-center gap-2.5"
                  >
                    <Mail
                      className="text-primary size-4"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                    {contact.email}
                  </a>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
