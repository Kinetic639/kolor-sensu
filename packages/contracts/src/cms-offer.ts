import { z } from "zod";
import { pageHeader, pageHeaderSchema } from "@repo/contracts/cms-shared";

// The CMS's words for the offer pages (docs/architecture/cms-domain.md):
// Oferta, every service's page (one pattern: its words shared by all, the
// service's own name, description and prices from the portal) and Cennik.
// Only words: the services, catalogues and prices come from the portal, the
// structure and look from code. Seeded as drafts with the site's words.

// ----------------------------------------------------------------- Oferta

/** /oferta: its top and the line while no service is published. */
export const offerPageContentSchema = z.strictObject({
  intro: pageHeaderSchema,
  emptyText: z.string().trim().min(1).max(400),
});

export type OfferPageContent = z.infer<typeof offerPageContentSchema>;

export const defaultOfferPage: OfferPageContent = {
  intro: pageHeader({
    eyebrow: "Nasza oferta",
    title: "Oferta",
    accent: "Wsparcie w różnych obszarach życia",
    lead: "Oferujemy terapię, konsultacje i warsztaty dopasowane do Twoich potrzeb.",
  }),
  emptyText:
    "Opis naszej oferty pojawi się tu wkrótce. Zadzwoń lub napisz do nas, a opowiemy, w czym możemy pomóc.",
};

// ---------------------------------------------------------- Strona usługi

/**
 * Every service's page: "Jak pracujemy" (the same on each), and what a
 * service shows instead of "Umów" and its price when it cannot be booked
 * online (no specialist offers it, or its online booking is off).
 */
export const servicePageContentSchema = z.strictObject({
  howWeWork: z.strictObject({
    eyebrow: z.string().trim().max(80),
    heading: z.string().trim().min(1).max(120),
    description: z.string().trim().max(600),
    ctaLabel: z.string().trim().min(1).max(40),
  }),
  unbooked: z.strictObject({
    priceText: z.string().trim().min(1).max(160),
    contactLabel: z.string().trim().min(1).max(40),
  }),
});

export type ServicePageContent = z.infer<typeof servicePageContentSchema>;

export const defaultServicePage: ServicePageContent = {
  howWeWork: {
    eyebrow: "Jak pracujemy",
    heading: "Spokojna rozmowa, bez oceniania",
    description:
      "Na pierwszym spotkaniu poznajemy Twoją historię i to, co chcesz zmienić. Razem ustalamy cel i rytm spotkań.",
    ctaLabel: "Umów pierwsze spotkanie",
  },
  unbooked: {
    priceText: "Cena ustalana indywidualnie",
    contactLabel: "Zadzwoń / napisz",
  },
};

// ----------------------------------------------------------------- Cennik

export const PRICE_RULES_MAX = 8;

const priceRuleSchema = z.strictObject({
  title: z.string().trim().min(1).max(80),
  text: z.string().trim().min(1).max(600),
});

export type PriceRule = z.infer<typeof priceRuleSchema>;

/**
 * /cennik: its top, the lines for an empty price list and for a service
 * without a price, and the rules of payment and cancelling. How long
 * before a visit it is cancelled free comes from the centre's settings;
 * the rules here say the rest.
 */
export const pricesPageContentSchema = z.strictObject({
  intro: pageHeaderSchema,
  emptyText: z.string().trim().min(1).max(400),
  noPriceText: z.string().trim().min(1).max(200),
  rulesHeading: z.string().trim().min(1).max(120),
  rules: z.array(priceRuleSchema).max(PRICE_RULES_MAX),
});

export type PricesPageContent = z.infer<typeof pricesPageContentSchema>;

export const defaultPricesPage: PricesPageContent = {
  intro: pageHeader({
    eyebrow: "Cennik",
    title: "Cennik",
    accent: "Jasno i bez niespodzianek.",
    lead: "Cena zależy od formy wsparcia i specjalisty. Poniżej znajdziesz aktualne ceny wszystkich usług.",
  }),
  emptyText:
    "Cennik pojawi się tu wkrótce. Zapytaj nas o ceny telefonicznie lub mailowo.",
  noPriceText: "Cena ustalana indywidualnie. Zapytaj nas o szczegóły.",
  rulesHeading: "Płatności i odwołania",
  // A draft for the centre to confirm before it is published.
  rules: [
    {
      title: "Nieodwołana wizyta",
      text: "Wizyta odwołana później albo nieodbyta bez odwołania jest płatna w całości.",
    },
    {
      title: "Formy płatności",
      text: "Za wizytę umówioną na stronie płacisz online, kartą lub BLIK-iem.",
    },
    {
      title: "Faktury",
      text: "Na prośbę wystawiamy fakturę. Napisz do nas, podając dane do faktury.",
    },
    {
      title: "Spotkania online",
      text: "Spotkanie online kosztuje tyle samo co spotkanie w gabinecie.",
    },
  ],
};
