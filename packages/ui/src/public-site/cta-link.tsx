"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { PageLink as Link, type PageLinkProps } from "./page-link";
import type { SiteCta, SiteResume } from "./site-types";

// The header's booking action. With `resume`, a booking the visitor began
// and left (its cookie, written by the wizard) turns "Umów wizytę" into
// "Dokończ rezerwację", leading back to where they stopped. Read in the
// browser, after the page is shown: the header itself stays prerendered.
// Inside the wizard it stays as it is.

/** The link the cookie keeps, if it is one into `under`; otherwise null. */
export function resumeHref(cookies: string, resume: SiteResume): string | null {
  const entry = cookies
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${resume.cookie}=`));
  if (!entry) return null;
  let href: string;
  try {
    href = decodeURIComponent(entry.slice(resume.cookie.length + 1));
  } catch {
    return null;
  }
  const rest = href.slice(resume.under.length);
  return href.startsWith(resume.under) &&
    /^(?:$|[/?])/.test(rest) &&
    !rest.startsWith("//") &&
    !/[\\\s]/.test(href)
    ? href
    : null;
}

const noChanges = () => () => {};
const readCookies = () => document.cookie;
const noCookies = () => "";

function within(path: string | null, under: string) {
  return path !== null && (path === under || path.startsWith(`${under}/`));
}

/**
 * The action as a link; its props (and a trailing child, the button's
 * arrow) come from the button it is rendered as (asChild).
 */
export function CtaLink({
  cta,
  children,
  ...props
}: Omit<PageLinkProps, "href"> & { cta: SiteCta }) {
  const pathname = usePathname();
  // The cookies as the browser has them now (read again on every render,
  // e.g. the next page); none in the server's HTML and while hydrating.
  const cookies = useSyncExternalStore(noChanges, readCookies, noCookies);
  const { resume } = cta;
  const resumed =
    resume && !within(pathname, resume.under)
      ? resumeHref(cookies, resume)
      : null;

  return (
    <Link {...props} href={resumed ?? cta.href}>
      {resumed && resume ? resume.label : cta.label}
      {children}
    </Link>
  );
}
