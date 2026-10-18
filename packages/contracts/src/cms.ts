import { z } from "zod";
import {
  plainHeader,
  sectionHeaderSchema,
} from "@repo/contracts/section-header";

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
 * profile photo). Its header (eyebrow, title, description) is among the
 * homepage's headers (homeHeadersContentSchema).
 */
export const homeSpotlightSchema = z
  .strictObject({
    visible: z.boolean(),
    specialistId: z.uuid().nullable().default(null),
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
    imagePath: null,
    imageAlt: "",
  },
};

/**
 * Home → "Pierwszy krok": a compact band of four steps of starting
 * therapy, joined by a wave that paints itself as the page scrolls. The
 * band (its animation, icons, layout) is code's; the CMS sets whether it
 * shows and the four steps' names and sentences. Its header is among the
 * homepage's headers (homeHeadersContentSchema).
 */
export const firstStepsContentSchema = z.strictObject({
  visible: z.boolean(),
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

/** Until anything is published: shown, with these steps. */
export const defaultFirstSteps: FirstStepsContent = {
  visible: true,
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

/**
 * Home → "Dlaczego my", under the areas of help: two to four facts about
 * the centre (supervision, confidentiality…), each a title and a sentence.
 * Its header is among the homepage's headers. Hidden until the admin
 * publishes facts the centre stands by.
 */
export const whyUsContentSchema = z.strictObject({
  visible: z.boolean(),
  facts: z
    .array(
      z.strictObject({
        title: z.string().trim().min(1).max(60),
        text: z.string().trim().min(1).max(200),
      }),
    )
    .min(2)
    .max(4),
});

export type WhyUsContent = z.infer<typeof whyUsContentSchema>;

export const defaultWhyUs: WhyUsContent = {
  visible: false,
  facts: [
    {
      title: "Superwizja",
      text: "Każdy specjalista pracuje pod regularną superwizją.",
    },
    {
      title: "Poufność",
      text: "To, o czym mówisz w gabinecie, zostaje między Tobą a specjalistą.",
    },
    {
      title: "Doświadczenie",
      text: "Zespół z wieloletnią praktyką, który stale się szkoli.",
    },
    {
      title: "Kodeks etyczny",
      text: "Pracujemy zgodnie z kodeksami etyki zawodowej.",
    },
  ],
};

/**
 * Home → the newsletter band: its words are its header; the CMS sets only
 * whether it shows. Hidden until signing up works.
 */
export const newsletterBandContentSchema = z.strictObject({
  visible: z.boolean(),
});

export type NewsletterBandContent = z.infer<typeof newsletterBandContentSchema>;

export const defaultNewsletterBand: NewsletterBandContent = { visible: false };

/**
 * Home → "Gdzie jesteśmy": its header is the CMS's, the address, phone,
 * e-mail and hours are the company details; the CMS sets whether it shows.
 */
export const homeLocationContentSchema = z.strictObject({
  visible: z.boolean(),
});

export type HomeLocationContent = z.infer<typeof homeLocationContentSchema>;

export const defaultHomeLocation: HomeLocationContent = { visible: true };

/** A phone number to call: digits and spaces, a plus only in front. */
const phoneNumberSchema = z
  .string()
  .trim()
  .min(3)
  .max(20)
  .regex(/^\+?[0-9][0-9 ]*$/);

/**
 * Home → the crisis strip: where to call right now, always shown (the
 * admin approves the words and the numbers, never hides it). The numbers
 * are dialled as written.
 */
export const crisisHelpContentSchema = z.strictObject({
  heading: z.string().trim().min(1).max(80),
  text: z.string().trim().max(200),
  lines: z
    .array(
      z.strictObject({
        number: phoneNumberSchema,
        label: z.string().trim().min(1).max(80),
        detail: z.string().trim().max(80),
      }),
    )
    .min(1)
    .max(6),
});

export type CrisisHelpContent = z.infer<typeof crisisHelpContentSchema>;

/** Until anything is published: the emergency number first, then the lines. */
export const defaultCrisisHelp: CrisisHelpContent = {
  heading: "Potrzebujesz pomocy teraz?",
  text: "Jeśli Twoje życie jest w zagrożeniu, dzwoń pod 112. Możesz też zadzwonić na bezpłatne linie wsparcia:",
  lines: [
    {
      number: "112",
      label: "Numer alarmowy",
      detail: "gdy życie jest w bezpośrednim zagrożeniu",
    },
    {
      number: "800 702 222",
      label: "Centrum Wsparcia dla Osób w Stanie Kryzysu Psychicznego",
      detail: "całodobowo, bezpłatnie",
    },
    {
      number: "116 123",
      label: "Kryzysowy Telefon Zaufania",
      detail: "dla dorosłych",
    },
    {
      number: "116 111",
      label: "Telefon Zaufania dla Dzieci i Młodzieży",
      detail: "całodobowo",
    },
  ],
};

/**
 * Home → the sections' headers (eyebrow, title, description, call to
 * action; @repo/contracts/section-header), one per section in the page's
 * order. Words and colours only: each section's markup is code's.
 */
export const HOME_HEADER_SECTIONS = [
  { key: "supportAreas", label: "Obszary wsparcia" },
  { key: "whyUs", label: "Dlaczego my" },
  { key: "firstSteps", label: "Pierwszy krok" },
  { key: "spotlight", label: "Z kim porozmawiasz" },
  { key: "specialists", label: "Poznaj nasz zespół" },
  { key: "rooms", label: "Przestrzeń, która wspiera" },
  { key: "story", label: "Jak zacząć" },
  { key: "newsletter", label: "Newsletter" },
  { key: "location", label: "Gdzie jesteśmy" },
] as const;

export type HomeHeaderSection = (typeof HOME_HEADER_SECTIONS)[number]["key"];

export const homeHeadersContentSchema = z.strictObject({
  supportAreas: sectionHeaderSchema,
  whyUs: sectionHeaderSchema,
  firstSteps: sectionHeaderSchema,
  spotlight: sectionHeaderSchema,
  specialists: sectionHeaderSchema,
  rooms: sectionHeaderSchema,
  story: sectionHeaderSchema,
  newsletter: sectionHeaderSchema,
  location: sectionHeaderSchema,
});

export type HomeHeadersContent = z.infer<typeof homeHeadersContentSchema>;

/** Until anything is published: the site's own words, in plain colours. */
export const defaultHomeHeaders: HomeHeadersContent = {
  supportAreas: plainHeader({
    eyebrow: "Obszary wsparcia",
    title: "W czym możemy pomóc",
    description:
      "Wybierz koło, aby zobaczyć, czym zajmujemy się w każdym z obszarów.",
  }),
  whyUs: plainHeader({
    eyebrow: "Dlaczego my",
    title: "Bezpieczna przestrzeń i doświadczony zespół",
  }),
  firstSteps: plainHeader({
    eyebrow: "Pierwszy krok",
    title: "Od pierwszego kontaktu do wsparcia na dłużej",
  }),
  spotlight: plainHeader({
    eyebrow: "Poznaj nasz zespół",
    title: "Z kim porozmawiasz",
  }),
  specialists: plainHeader({
    eyebrow: "Nasi specjaliści",
    title: "Poznaj nasz zespół",
    description:
      "Doświadczony zespół specjalistów, którzy z empatią i zaangażowaniem towarzyszą w drodze do lepszego samopoczucia.",
    cta: {
      label: "Zobacz wszystkich specjalistów",
      href: "/specjalisci",
      style: "arrow",
    },
  }),
  rooms: plainHeader({
    eyebrow: "Nasze gabinety",
    title: "Przestrzeń, która wspiera",
    description:
      "Jasne, przytulne gabinety stworzone z myślą o Twoim komforcie i poczuciu bezpieczeństwa.",
    cta: { label: "Zobacz nasze gabinety", href: "/gabinety", style: "arrow" },
  }),
  story: plainHeader({
    eyebrow: "Jak zacząć",
    title: "Twoja droga do lepszego samopoczucia",
  }),
  newsletter: plainHeader({
    eyebrow: "Newsletter",
    title: "Bądźmy w kontakcie",
    description: "Artykuły, warsztaty i nowości z centrum, raz w miesiącu.",
  }),
  location: plainHeader({
    eyebrow: "Gdzie jesteśmy",
    title: "Odwiedź nas",
    cta: { label: "Kontakt", href: "/kontakt", style: "arrow" },
  }),
};

export interface SiteContentAdmin<Content> {
  draft: Content;
  published: Content | null;
  publishedAt: string | null;
  updatedAt: string;
}
