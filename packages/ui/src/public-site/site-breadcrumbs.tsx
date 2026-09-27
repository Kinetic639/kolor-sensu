import Link from "next/link";
import { Fragment } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../breadcrumb";
import { JsonLd } from "./json-ld";

// Server-safe. "Strona główna › Oferta › Psychoterapia par" on subpages
// (shadcn Breadcrumb, restyled), with the same trail as a schema.org
// BreadcrumbList so search results show it too.

export interface SiteBreadcrumbsProps {
  /** From the home page to the current page; the last item has no link. */
  items: ReadonlyArray<{ label: string; href?: string }>;
  /** Absolute origin for the structured data, e.g. https://kolorsensu.pl */
  siteUrl?: string;
  className?: string;
}

export function SiteBreadcrumbs({
  items,
  siteUrl,
  className,
}: SiteBreadcrumbsProps) {
  const absolute = (href: string) =>
    siteUrl ? new URL(href, siteUrl).toString() : href;
  return (
    <>
      <Breadcrumb className={className}>
        <BreadcrumbList className="text-small text-text-muted gap-1.5 sm:gap-2">
          {items.map((item, index) => {
            const last = index === items.length - 1;
            return (
              <Fragment key={`${item.label}-${index}`}>
                <BreadcrumbItem>
                  {last || !item.href ? (
                    <BreadcrumbPage className="text-ink font-medium">
                      {item.label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link
                        href={item.href}
                        className="hover:text-primary focus-visible:outline-ring rounded-sm underline-offset-4 hover:underline focus-visible:outline-2"
                      >
                        {item.label}
                      </Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {last ? null : (
                  <BreadcrumbSeparator className="text-border-strong" />
                )}
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: items.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.label,
            ...(item.href ? { item: absolute(item.href) } : {}),
          })),
        }}
      />
    </>
  );
}
