import { z } from "zod";

/**
 * The public website's routes/layout/structure are code-owned in Next.js.
 * The CMS only edits predefined content fields inside fixed pages — it can
 * never create pages, sections, or routes. `homePageContentSchema` is the
 * one typed content contract for the one page that currently has editable
 * CMS content (Home). Unknown fields are rejected, not silently stripped.
 */
export const homePageContentSchema = z.strictObject({
  heading: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(2000),
  buttonLabel: z.string().trim().max(100).nullable().default(null),
});

export type HomePageContent = z.infer<typeof homePageContentSchema>;

export type HomeContentAdmin = SiteContentAdmin<HomePageContent>;

/**
 * /gabinety: the page's structure (title, rooms per location) is code-owned;
 * the CMS only switches its optional sections on and off.
 */
export const roomsPageContentSchema = z.strictObject({
  /** "Co u nas znajdziesz" under the title. */
  showAmenitiesSection: z.boolean(),
  /** Each location's address, description and amenities above its rooms. */
  showLocationDetails: z.boolean(),
});

export type RoomsPageContent = z.infer<typeof roomsPageContentSchema>;

export const defaultRoomsPageContent: RoomsPageContent = {
  showAmenitiesSection: true,
  showLocationDetails: true,
};

/**
 * Home → the areas of help ("Obszary wsparcia"): small circles around a large
 * one, each area shown in the large one when chosen. The section is
 * code-owned; the CMS edits the list of areas only.
 */
export const SUPPORT_AREAS_MAX = 10;

/** A path within the public site ("/oferta", "/umow-wizyte#termin"). */
const sitePathSchema = z
  .string()
  .trim()
  .max(200)
  .refine(
    (href) =>
      href.startsWith("/") && !href.startsWith("//") && !/\s/.test(href),
    "Podaj adres na stronie, zaczynający się od /",
  );

export const supportAreaSchema = z.strictObject({
  /** Stable while the area is edited or moved (also the key on the site). */
  id: z.string().trim().min(1).max(64),
  title: z.string().trim().min(1).max(60),
  /** A sentence or two, shown in the large circle. */
  lead: z.string().trim().min(1).max(240),
  /** The photo, a file in the public site-media bucket (none: paint only). */
  imagePath: z.string().trim().min(1).max(300).nullable().default(null),
  imageAlt: z.string().trim().max(200).default(""),
  /** Where the large circle leads (none: to booking). */
  link: z
    .strictObject({
      href: sitePathSchema,
      label: z.string().trim().min(1).max(40),
    })
    .nullable()
    .default(null),
});

export type SupportArea = z.infer<typeof supportAreaSchema>;

export const supportAreasContentSchema = z.strictObject({
  areas: z
    .array(supportAreaSchema)
    .min(1)
    .max(SUPPORT_AREAS_MAX)
    .refine(
      (areas) => new Set(areas.map((area) => area.id)).size === areas.length,
      "Każdy obszar musi mieć inny identyfikator",
    ),
});

export type SupportAreasContent = z.infer<typeof supportAreasContentSchema>;

/**
 * Home → which specialist sections show. "Poznaj nasz zespół" (all
 * specialists, as cards) and "Z kim porozmawiasz" (one chosen specialist,
 * presented at length) are switched separately; the latter brings its own
 * texts and, optionally, a photo of its own (else the specialist's
 * profile photo). Empty texts fall back to the site's own.
 */
export const homeSpotlightSchema = z
  .strictObject({
    visible: z.boolean(),
    specialistId: z.uuid().nullable().default(null),
    eyebrow: z.string().trim().max(60).default(""),
    heading: z.string().trim().max(100).default(""),
    description: z.string().trim().max(300).default(""),
    /** A photo for this section, in the public site-media bucket. */
    imagePath: z.string().trim().min(1).max(300).nullable().default(null),
    imageAlt: z.string().trim().max(200).default(""),
  })
  .refine((spotlight) => !spotlight.visible || spotlight.specialistId, {
    message: "Wybierz specjalistę, aby pokazać sekcję",
    path: ["specialistId"],
  });

export type HomeSpotlight = z.infer<typeof homeSpotlightSchema>;

export const homeSectionsContentSchema = z.strictObject({
  /** "Poznaj nasz zespół": the specialists' cards. */
  showSpecialists: z.boolean(),
  /** "Z kim porozmawiasz": one specialist. */
  spotlight: homeSpotlightSchema,
});

export type HomeSectionsContent = z.infer<typeof homeSectionsContentSchema>;

/** Until anything is published: the team shown, the spotlight hidden. */
export const defaultHomeSections: HomeSectionsContent = {
  showSpecialists: true,
  spotlight: {
    visible: false,
    specialistId: null,
    eyebrow: "",
    heading: "",
    description: "",
    imagePath: null,
    imageAlt: "",
  },
};

/**
 * Home → "Pierwszy krok": a compact band of four steps of starting
 * therapy, joined by a wave that paints itself as the page scrolls. The
 * band (its animation, icons, layout) is code's; the CMS sets whether it
 * shows, its words and the four steps' names and sentences.
 */
export const firstStepsContentSchema = z.strictObject({
  visible: z.boolean(),
  eyebrow: z.string().trim().max(60).default(""),
  heading: z.string().trim().min(1).max(100),
  description: z.string().trim().max(300).default(""),
  steps: z
    .array(
      z.strictObject({
        title: z.string().trim().min(1).max(40),
        text: z.string().trim().min(1).max(200),
      }),
    )
    .length(4),
});

export type FirstStepsContent = z.infer<typeof firstStepsContentSchema>;

/** Until anything is published: shown, with these words. */
export const defaultFirstSteps: FirstStepsContent = {
  visible: true,
  eyebrow: "Pierwszy krok",
  heading: "Od pierwszego kontaktu do wsparcia na dłużej",
  description: "",
  steps: [
    {
      title: "Kontakt",
      text: "Umawiasz się na dogodny termin: telefonicznie, przez formularz lub online.",
    },
    {
      title: "Pierwsze spotkanie",
      text: "Rozmawiamy o Twoich potrzebach, pytaniach i oczekiwaniach.",
    },
    {
      title: "Wspólny plan",
      text: "Proponujemy możliwe formy wsparcia i dalsze kroki.",
    },
    {
      title: "Rozpoczęcie pracy",
      text: "Zaczynamy proces terapeutyczny w Twoim tempie i w bezpiecznej atmosferze.",
    },
  ],
};

export interface SiteContentAdmin<Content> {
  draft: Content;
  published: Content | null;
  publishedAt: string | null;
  updatedAt: string;
}
