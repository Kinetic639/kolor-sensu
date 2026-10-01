import { PageLink as Link } from "./page-link";
import { cn } from "../lib/utils";
import { PrimaryButton } from "./actions";
import { HeaderScroll } from "./header-scroll";
import { brandTagline, SiteLogo } from "./site-logo";
import { SiteMobileNav } from "./site-mobile-nav";
import { SiteNavigation } from "./site-navigation";
import type { SiteContact, SiteLink, SiteNavItem } from "./site-types";

// Server-safe: the header is server HTML; only the desktop dropdown and the
// mobile sheet hydrate (SiteNavigation, SiteMobileNav).
//
//   logo · navigation (from 64 rem) · "Umów wizytę" (from 40 rem) · menu
//   button (below 64 rem)
//
// Sticky on paper with a hairline under it, no blur, no shadow. HeaderScroll
// only marks the scroll state: the hairline shows once the page has moved,
// and the header steps aside while reading down, back on scrolling up.

export interface SiteHeaderProps {
  navigation: readonly SiteNavItem[];
  cta?: SiteLink;
  contact?: SiteContact;
  /** The page's path, to mark its navigation item (aria-current). */
  currentPath?: string;
  className?: string;
}

export function SiteHeader({
  navigation,
  cta,
  contact,
  currentPath,
  className,
}: SiteHeaderProps) {
  return (
    <header
      className={cn(
        "ks-site-header bg-bg border-border/70 sticky top-0 z-40 border-b",
        className,
      )}
    >
      <div className="max-w-page px-gutter mx-auto flex h-14 items-center gap-4 lg:h-16">
        <SiteLogo tagline={brandTagline} />
        <SiteNavigation
          items={navigation}
          currentPath={currentPath}
          className="ml-auto hidden lg:flex"
        />
        {cta ? (
          <PrimaryButton
            asChild
            arrow
            size="sm"
            className="ml-auto hidden sm:inline-flex lg:ml-2"
          >
            <Link href={cta.href}>{cta.label}</Link>
          </PrimaryButton>
        ) : null}
        <SiteMobileNav
          items={navigation}
          cta={cta}
          contact={contact}
          currentPath={currentPath}
          className="ml-auto sm:ml-0 lg:hidden"
        />
      </div>
      <HeaderScroll />
    </header>
  );
}
