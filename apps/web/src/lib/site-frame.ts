import { catalogAnchor } from "@repo/contracts";
import { companyLine } from "@repo/contracts/company";
import {
  serviceDisplayName,
  type SiteContact,
  type SiteNavItem,
  type SiteSocial,
} from "@repo/ui/public-site";
import { cache } from "react";
import { bookingCta, footerAbout, legalLinks } from "@/content/site";
import {
  getAnnouncement,
  getCenter,
  getCompany,
  getLocations,
  getOffer,
  getServices,
  getSiteContact,
  type PublicOfferEntry,
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
  return serviceDisplayName(service.name);
}

const serviceLink = (service: PublicService) => ({
  label: serviceTitle(service),
  href: serviceHref(service.slug),
});

/**
 * The header's menu. "O nas": the team, the rooms and the contact, its own
 * page at the end. "Oferta": the services outside a catalogue one under
 * another, and each catalogue opening its own (its link: its place on the
 * offer page).
 */
function navigation(offer: PublicOfferEntry[]): SiteNavItem[] {
  return [
    {
      label: "O nas",
      href: "/o-nas",
      allLabel: "Więcej o nas",
      children: [
        { label: "Specjaliści", href: "/specjalisci" },
        { label: "Gabinety", href: "/gabinety" },
        { label: "Kontakt", href: "/kontakt" },
      ],
    },
    {
      label: "Oferta",
      href: "/oferta",
      footerColumn: true,
      links: [{ label: "Cennik", href: "/cennik" }],
      ...(offer.length > 0 && {
        children: offer.map((entry) =>
          entry.kind === "service"
            ? serviceLink(entry.service)
            : {
                label: entry.catalog.name,
                href: `/oferta#${catalogAnchor(entry.catalog.name)}`,
                children: entry.services.map(serviceLink),
              },
        ),
      }),
    },
    { label: "Warsztaty", href: "/warsztaty" },
    { label: "Edukacja", href: "/edukacja" },
  ];
}

// "+48 61 123 45 67" → "+48611234567", as dialled.
const dialled = (phone: string) => phone.replace(/[^\d+]/g, "");

export const getSiteFrame = cache(async () => {
  const [center, locations, services, offer, announcement, company, hours] =
    await Promise.all([
      getCenter(),
      getLocations(),
      getServices(),
      getOffer(),
      getAnnouncement(),
      getCompany(),
      // The contact hours: Ustawienia wspólne in the CMS (#23).
      getSiteContact().then((details) => details.hours),
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
        ...(hours && { hours }),
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
    navigation: navigation(offer),
    cta: bookingCta,
    contact,
    socials,
    legal: legalLinks,
    about: center?.shortDescription ?? footerAbout,
    locations,
    services,
    announcement,
    company: company ? companyLine(company) : null,
  };
});
