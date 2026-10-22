import { Clock, Mail, MapPin, Phone } from "lucide-react";
import type { ReactNode } from "react";
import { PageLink as Link } from "./page-link";
import { CookieSettingsButton } from "./cookie-consent";
import { cn } from "../lib/utils";
import { Separator } from "../separator";
import { brandTagline, SiteLogo } from "./site-logo";
import type {
  SiteContact,
  SiteLink,
  SiteNavItem,
  SiteSocial,
} from "./site-types";
import { SocialIcon, socialNames } from "./social-icons";

// Server-safe. Reference A's footer: the brand with a line about the centre,
// the navigation, the offer, contact details (a real <address>, links that
// dial and write) and social profiles; the site's newsletter form when it is
// on; under a hairline, the copyright and the legal links.

export interface SiteFooterProps {
  navigation: readonly SiteNavItem[];
  /** Left out, the footer has no contact column. */
  contact?: SiteContact;
  socials?: readonly SiteSocial[];
  legal?: readonly SiteLink[];
  /** A sentence about the centre under the logo. */
  about?: string;
  /** Year shown in the copyright line. */
  year?: number;
  /** The company in one line (its name, address, NIP), under it. */
  company?: string | null;
  /** The newsletter's sign-up form (the site's), under the columns. */
  newsletter?: ReactNode;
  className?: string;
}

function ColumnTitle({ children }: { children: string }) {
  return (
    <h2 className="text-eyebrow text-text-muted mb-4 uppercase">{children}</h2>
  );
}

const linkStyle =
  "text-small text-ink hover:text-primary-strong focus-visible:outline-ring rounded-sm underline-offset-4 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2";

export function SiteFooter({
  navigation,
  contact,
  socials = [],
  legal = [],
  about,
  year = new Date().getFullYear(),
  company = null,
  newsletter = null,
  className,
}: SiteFooterProps) {
  const offer = navigation.find((item) => item.footerColumn);
  // Every other page, a dropdown's own and its pages each on a line.
  const pages = navigation
    .filter((item) => item !== offer)
    .flatMap((item) => [
      { label: item.label, href: item.href },
      ...(item.children ?? []).map(({ label, href }) => ({ label, href })),
    ])
    // The offer's own pages beside its list (`Cennik`) are pages too.
    .concat(offer?.links ?? []);
  // Every offer page: a group's (a catalogue's) unfolded. None yet (a new
  // centre without services): no offer column.
  const offerPages = (offer?.children ?? []).flatMap(
    (child) => child.children ?? [child],
  );

  return (
    <footer className={cn("border-border/70 bg-bg border-t", className)}>
      <div className="max-w-page px-gutter mx-auto grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr] lg:gap-12 lg:py-16">
        <div className="grid content-start gap-5 sm:col-span-2 lg:col-span-1">
          <SiteLogo size="lg" tagline={brandTagline} />
          {about ? (
            <p className="text-small text-text-muted max-w-xs">{about}</p>
          ) : null}
          {socials.length ? (
            <ul className="flex gap-2" aria-label="Obserwuj nas">
              {socials.map(({ network, href }) => (
                <li key={network}>
                  <a
                    href={href}
                    rel="me noopener"
                    className="border-border-strong/40 text-primary hover:bg-primary-soft focus-visible:outline-ring grid size-10 place-items-center rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    <SocialIcon network={network} className="size-4.5" />
                    <span className="sr-only">{`Kolor Sensu: ${socialNames[network]}`}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <nav aria-label="Stopka">
          <ColumnTitle>Nawigacja</ColumnTitle>
          <ul className="grid gap-2.5">
            {pages.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={linkStyle}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {offer && offerPages.length > 0 ? (
          <nav aria-label={offer.label}>
            <ColumnTitle>{offer.label}</ColumnTitle>
            <ul className="grid gap-2.5">
              {offerPages.map((child) => (
                <li key={child.href}>
                  <Link href={child.href} className={linkStyle}>
                    {child.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        {contact ? (
          <div>
            <ColumnTitle>Kontakt</ColumnTitle>
            <address className="text-small grid gap-3 not-italic">
              <p className="flex gap-3">
                <MapPin
                  className="text-primary mt-0.5 size-4 shrink-0"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <span>
                  {contact.address.street}
                  <br />
                  {`${contact.address.postalCode} ${contact.address.city}`}
                </span>
              </p>
              {contact.phone ? (
                <a
                  href={`tel:${contact.phone}`}
                  className={cn(linkStyle, "flex gap-3")}
                >
                  <Phone
                    className="text-primary mt-0.5 size-4 shrink-0"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  {contact.phoneLabel ?? contact.phone}
                </a>
              ) : null}
              {contact.email ? (
                <a
                  href={`mailto:${contact.email}`}
                  className={cn(linkStyle, "flex gap-3")}
                >
                  <Mail
                    className="text-primary mt-0.5 size-4 shrink-0"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  {contact.email}
                </a>
              ) : null}
              {contact.hours ? (
                <p className="text-text-muted flex gap-3">
                  <Clock
                    className="text-primary mt-0.5 size-4 shrink-0"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  {contact.hours}
                </p>
              ) : null}
            </address>
          </div>
        ) : null}
      </div>

      {newsletter ? (
        <div className="max-w-page px-gutter mx-auto pb-12">
          <div className="max-w-xl">{newsletter}</div>
        </div>
      ) : null}

      <div className="max-w-page px-gutter mx-auto">
        <Separator className="bg-border/70" />
        <div className="text-small text-text-muted flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid gap-1">
            <p>{`© ${year} Kolor Sensu. Wszelkie prawa zastrzeżone.`}</p>
            {company ? <p>{company}</p> : null}
          </div>
          {legal.length ? (
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="hover:text-ink focus-visible:outline-ring rounded-sm underline-offset-4 hover:underline focus-visible:outline-2"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              {/* Back to the cookie notice: change or withdraw consent. */}
              <li>
                <CookieSettingsButton className="hover:text-ink focus-visible:outline-ring cursor-pointer rounded-sm underline-offset-4 hover:underline focus-visible:outline-2" />
              </li>
            </ul>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
