import type {
  SiteContact,
  SiteNavItem,
  SiteSocial,
} from "@repo/ui/public-site";
import { cache } from "react";
import {
  bookingCta,
  footerAbout,
  legalLinks,
  openingHours,
} from "@/content/site";
import {
  getCenter,
  getLocations,
  getServices,
  type PublicService,
} from "@/lib/public-data";

// The site's frame (header, footer, structured data), assembled from the
// database with the site's own content: the offer menu lists the published
// services, the contact details come from the first public location and the
// centre's public profile.

export function serviceHref(slug: string) {
  return `/oferta/${slug}`;
}

/** Service names are entered by hand; show them with a capital letter. */
export function serviceTitle(service: Pick<PublicService, "name">) {
  const name = service.name.trim();
  return name.charAt(0).toLocaleUpperCase("pl-PL") + name.slice(1);
}

function navigation(services: PublicService[]): SiteNavItem[] {
  return [
    { label: "O nas", href: "/o-nas" },
    { label: "Specjaliści", href: "/specjalisci" },
    {
      label: "Oferta",
      href: "/oferta",
      ...(services.length > 0 && {
        children: services.map((service) => ({
          label: serviceTitle(service),
          href: serviceHref(service.slug),
          ...(service.shortDescription && {
            description: service.shortDescription,
          }),
        })),
      }),
    },
    { label: "Gabinety", href: "/gabinety" },
    { label: "Warsztaty", href: "/warsztaty" },
    { label: "Cennik", href: "/cennik" },
    { label: "Kontakt", href: "/kontakt" },
  ];
}

// "+48 61 123 45 67" → "+48611234567", as dialled.
const dialled = (phone: string) => phone.replace(/[^\d+]/g, "");

export const getSiteFrame = cache(async () => {
  const [center, locations, services] = await Promise.all([
    getCenter(),
    getLocations(),
    getServices(),
  ]);
  // The first location with a usable address.
  const location = locations.find((one) => one.addressLine1 && one.city);

  const contact: SiteContact | undefined = location
    ? {
        address: {
          street: [location.addressLine1, location.addressLine2]
            .filter(Boolean)
            .join(", "),
          postalCode: location.postalCode ?? "",
          city: location.city ?? "",
        },
        ...(center?.publicPhone && {
          phone: dialled(center.publicPhone),
          phoneLabel: center.publicPhone,
        }),
        ...(center?.publicEmail && { email: center.publicEmail }),
        hours: openingHours,
      }
    : undefined;

  const socials: SiteSocial[] = [
    ...(center?.instagramUrl
      ? [{ network: "instagram" as const, href: center.instagramUrl }]
      : []),
    ...(center?.facebookUrl
      ? [{ network: "facebook" as const, href: center.facebookUrl }]
      : []),
  ];

  return {
    navigation: navigation(services),
    cta: bookingCta,
    contact,
    socials,
    legal: legalLinks,
    about: center?.shortDescription ?? footerAbout,
    locations,
    services,
  };
});
