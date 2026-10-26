import { ChevronDown, Clock, Mail, MapPin, Phone } from "lucide-react";
import type { ReactNode } from "react";
import { PageLink as Link } from "./page-link";
import { CookieSettingsButton } from "./cookie-consent";
import { cn } from "../lib/utils";
import { brandTagline, SiteLogo } from "./site-logo";
import type {
  SiteContact,
  SiteLink,
  SiteNavItem,
  SiteSocial,
} from "./site-types";
import { SocialIcon, socialNames } from "./social-icons";
import { crisisLineHref, type CrisisLine } from "./crisis-strip";

// Server-safe. Painted footer with short link lists; native disclosures
// keep the complete navigation available without requiring JavaScript.

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
  /** The same CMS-managed crisis numbers used on the homepage. */
  crisisLines?: readonly CrisisLine[];
  className?: string;
}

function ColumnTitle({ children }: { children: string }) {
  return <h2 className="ks-footer__title">{children}</h2>;
}

/** Drawn at footer scale: uneven pen pressure and independent, quiet deviations. */
function CrisisSeparator({ position }: { position: "top" | "bottom" }) {
  const path =
    position === "top"
      ? "M 5 12.8 C 62 8.6 111 14.6 178 10.7 C 244 6.8 285 12.3 353 9.7 C 410 7.4 461 14.5 532 11.1 C 592 8.2 634 8.9 699 12 C 769 15.3 809 8.4 878 10 C 944 11.5 990 6.8 1048 9.6 C 1101 12.1 1145 8.2 1196 10.4"
      : "M 4 10.3 C 66 13.8 110 8.1 167 10.6 C 229 13.5 291 7.1 361 10 C 429 12.8 470 9.2 528 11.8 C 599 14.8 633 7.8 700 10.2 C 778 13 815 9.4 883 11.4 C 949 13.6 992 7.2 1047 9.7 C 1107 12.4 1150 8.1 1196 11.9";
  return (
    <svg
      className={`ks-footer__crisis-rule ks-footer__crisis-rule--${position}`}
      viewBox="0 0 1200 22"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
    >
      <path
        d={path}
        strokeWidth="1.15"
        strokeOpacity="0.85"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={path}
        transform="translate(0.3 0.9)"
        strokeWidth="0.45"
        strokeOpacity="0.3"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={path}
        strokeWidth="1.8"
        strokeOpacity="0.2"
        strokeDasharray="100 45 190 85 150 90 220 55"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

const linkStyle =
  "text-small text-ink hover:text-primary-strong focus-visible:outline-ring rounded-sm underline-offset-4 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2";

function FooterLinks({
  items,
  limit,
  moreLabel,
}: {
  items: readonly SiteLink[];
  limit: number;
  moreLabel: string;
}) {
  const links = [...new Map(items.map((item) => [item.href, item])).values()];
  const list = (items: readonly SiteLink[]) => (
    <ul className="ks-footer__links">
      {items.map((item) => (
        <li key={item.href}>
          <Link href={item.href} className={linkStyle}>
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
  return (
    <>
      {list(links.slice(0, limit))}
      {links.length > limit ? (
        <details className="ks-footer__more">
          <summary>
            {moreLabel}
            <ChevronDown aria-hidden="true" size={14} />
          </summary>
          {list(links.slice(limit))}
        </details>
      ) : null}
    </>
  );
}

export function SiteFooter({
  navigation,
  contact,
  socials = [],
  legal = [],
  about,
  year = new Date().getFullYear(),
  company = null,
  newsletter = null,
  crisisLines = [],
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
    <footer className={cn("ks-footer", className)}>
      <div className="ks-footer__paint" aria-hidden="true" />
      <div className="ks-footer__main max-w-page px-gutter mx-auto">
        <div className="ks-footer__brand">
          <SiteLogo size="lg" tagline={brandTagline} />
          {about ? <p className="ks-footer__about">{about}</p> : null}
          {socials.length ? (
            <ul className="flex gap-2" aria-label="Obserwuj nas">
              {socials.map(({ network, href }) => (
                <li key={network}>
                  <a
                    href={href}
                    rel="me noopener"
                    className="ks-footer__social focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2"
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
          <ColumnTitle>Na skróty</ColumnTitle>
          <FooterLinks items={pages} limit={6} moreLabel="Więcej stron" />
        </nav>

        {offer && offerPages.length > 0 ? (
          <nav aria-label={offer.label}>
            <ColumnTitle>{offer.label}</ColumnTitle>
            <FooterLinks
              items={offerPages}
              limit={3}
              moreLabel="Więcej usług"
            />
          </nav>
        ) : null}

        {contact ? (
          <div className="ks-footer__contact">
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

      {crisisLines.length > 0 ? (
        <aside
          aria-label="Pomoc w kryzysie"
          className="ks-footer__crisis max-w-page px-gutter mx-auto"
        >
          <CrisisSeparator position="top" />
          <Link href="/pomoc-w-kryzysie" className="ks-footer__crisis-title">
            <Phone aria-hidden="true" size={16} strokeWidth={1.5} />
            Pomoc w kryzysie
          </Link>
          <ul className="ks-footer__crisis-numbers">
            {crisisLines.map((line) => (
              <li key={line.number}>
                <a
                  href={crisisLineHref(line.number)}
                  aria-label={`${line.label}: ${line.number}. ${line.detail}`}
                >
                  <span className="ks-footer__crisis-number">
                    {line.number}
                  </span>
                  <span className="ks-footer__crisis-label">{line.label}</span>
                  {line.detail ? (
                    <span className="ks-footer__crisis-detail">
                      {line.detail}
                    </span>
                  ) : null}
                </a>
              </li>
            ))}
          </ul>
          <CrisisSeparator position="bottom" />
        </aside>
      ) : null}

      {newsletter ? (
        <div className="ks-footer__newsletter max-w-page px-gutter mx-auto">
          {newsletter}
        </div>
      ) : null}

      <div className="ks-footer__bottom max-w-page px-gutter mx-auto">
        <div className="grid gap-1">
          <p>{`© ${year} Kolor Sensu. Wszelkie prawa zastrzeżone.`}</p>
          {company ? <p>{company}</p> : null}
        </div>
        <ul className="ks-footer__legal">
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
      </div>
    </footer>
  );
}
