import { z } from "zod";
import {
  plainHeader,
  sectionHeaderSchema,
} from "@repo/contracts/section-header";
import {
  pageHeader,
  pageHeaderSchema,
  sitePathSchema,
} from "@repo/contracts/cms-shared";

/**
 * The public website's routes/layout/structure are code-owned in Next.js.
 * The CMS only edits predefined content fields inside fixed pages — it can
 * never create pages, sections, or routes. `homePageContentSchema` is the
 * one typed content contract for the one page that currently has editable
 * CMS content (Home). Unknown fields are rejected, not silently stripped.
 */
/** The icons a hero point may carry (the site draws each). */
export const HERO_POINT_ICONS = [
  "leaf",
  "users",
  "house",
  "heart",
  "shield",
  "sparkles",
] as const;
export const HERO_POINTS_MAX = 4;

export const heroPointSchema = z.strictObject({
  label: z.string().trim().min(1).max(40),
  icon: z.enum(HERO_POINT_ICONS),
});

export type HeroPoint = z.infer<typeof heroPointSchema>;

export const defaultHeroPoints: HeroPoint[] = [
  { label: "Doświadczeni specjaliści", icon: "leaf" },
  { label: "Indywidualne podejście", icon: "users" },
  { label: "Przytulne gabinety", icon: "house" },
  { label: "Atmosfera zaufania", icon: "heart" },
];

/**
 * Home → the hero. Fields added later default to the site's own words, so
 * a hero saved before them still reads (and shows as it did). An empty
 * eyebrow or accent is simply not shown.
 */
export const homePageContentSchema = z.strictObject({
  eyebrow: z.string().trim().max(80).default("Centrum psychoterapii i rozwoju"),
  heading: z.string().trim().min(1).max(200),
  /** The heading's second line, in brand green. */
  accent: z.string().trim().max(80).default("Więcej sensu."),
  body: z.string().trim().min(1).max(2000),
  buttonLabel: z.string().trim().max(100).nullable().default(null),
  /** "Poznaj nas" (to O nas); none: its default label. */
  secondaryLabel: z.string().trim().max(40).nullable().default(null),
  points: z
    .array(heroPointSchema)
    .max(HERO_POINTS_MAX)
    .default(() => defaultHeroPoints.map((point) => ({ ...point }))),
  /** The photo, a file in the public site-media bucket (none: the site's). */
  imagePath: z.string().trim().min(1).max(300).nullable().default(null),
  imageAlt: z.string().trim().max(200).default(""),
});

export type HomePageContent = z.infer<typeof homePageContentSchema>;

export type HomeContentAdmin = SiteContentAdmin<HomePageContent>;

/**
 * /gabinety: the page's structure (title, rooms per location) is code-owned;
 * the CMS only switches its optional sections on and off.
 */
/** /gabinety's own words until the CMS has others (the site's until 19.10). */
export const defaultRoomsIntro = pageHeader({
  eyebrow: "Nasze gabinety",
  title: "Gabinety",
  accent: "Przestrzeń dla ważnych rozmów.",
  lead: "Nasze gabinety są jasne, ciche i przytulne. Zadbaliśmy o to, żeby już od progu łatwiej było odetchnąć i poczuć się bezpiecznie.",
});

export const defaultRoomsAmenities = [
  "Wygodne fotele i spokojne, naturalne kolory",
  "Dobra izolacja akustyczna: rozmowa zostaje w gabinecie",
  "Poczekalnia z herbatą i wodą",
  "Dogodny dojazd w centrum miasta",
];

/**
 * /gabinety: its switches, and (since 19.10) its words. Fields added later
 * default to the site's own, so content saved before them still reads.
 */
export const roomsPageContentSchema = z.strictObject({
  /** "Co u nas znajdziesz" under the title. */
  showAmenitiesSection: z.boolean(),
  /** Each location's address, description and amenities above its rooms. */
  showLocationDetails: z.boolean(),
  intro: pageHeaderSchema.default(() => structuredClone(defaultRoomsIntro)),
  amenitiesHeading: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .default("Co u nas znajdziesz"),
  amenities: z
    .array(z.string().trim().min(1).max(120))
    .max(8)
    .default(() => [...defaultRoomsAmenities]),
  /** Shown while no room has been published yet. */
  emptyText: z
    .string()
    .trim()
    .min(1)
    .max(300)
    .default("Zdjęcia i opisy gabinetów pojawią się tu wkrótce."),
});

export type RoomsPageContent = z.infer<typeof roomsPageContentSchema>;

export const defaultRoomsPageContent: RoomsPageContent =
  roomsPageContentSchema.parse({
    showAmenitiesSection: true,
    showLocationDetails: true,
  });

/**
 * Home → the areas of help ("Obszary wsparcia"): small circles around a large
 * one, each area shown in the large one when chosen. The section is
 * code-owned; the CMS edits the list of areas only.
 */
export const SUPPORT_AREAS_MAX = 10;

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

/** How few pairs fill the crowd's rows, and how many it takes. */
export const HOME_THOUGHT_PAIRS_MIN = 8;
export const HOME_THOUGHT_PAIRS_MAX = 40;

/** A difficult thought and the kinder one it turns into when pointed at. */
export const homeThoughtPairSchema = z.strictObject({
  negative: z.string().trim().min(1).max(40),
  positive: z.string().trim().min(1).max(60),
});

export type HomeThoughtPair = z.infer<typeof homeThoughtPairSchema>;

/**
 * Home → "Myśli, które się odmieniają": a crowd of difficult thoughts (the
 * band needs enough of them to fill its rows), each paired with the kinder
 * one it turns into, with the band's name for assistive technology.
 */
export const homeThoughtsContentSchema = z.strictObject({
  label: z.string().trim().min(1).max(120),
  pairs: z
    .array(homeThoughtPairSchema)
    .min(HOME_THOUGHT_PAIRS_MIN)
    .max(HOME_THOUGHT_PAIRS_MAX),
});

export type HomeThoughtsContent = z.infer<typeof homeThoughtsContentSchema>;

/**
 * Pairs the thoughts as saved before 19.10 (two lists) the way the site
 * showed them then: the difficult ones dealt into two rows, each row three
 * times over, a kinder one under every word in turn, counted across the
 * band. Each difficult thought keeps the kinder one its first showing had.
 * The database converts its rows the same way
 * (supabase/migrations/20261019110000_home_thought_pairs.sql).
 */
export function pairLegacyThoughts(
  negative: readonly string[],
  positive: readonly string[],
): HomeThoughtPair[] {
  if (positive.length === 0) return [];
  const firstRow = Math.ceil(negative.length / 2);
  return negative.map((thought, index) => {
    const shown = index % 2 === 0 ? index / 2 : 3 * firstRow + (index - 1) / 2;
    return { negative: thought, positive: positive[shown % positive.length]! };
  });
}

/**
 * The thoughts as stored: until the migration has run (and while a deploy
 * runs ahead of it), a row may still hold the two lists, which read as
 * pairs (pairLegacyThoughts).
 */
export const storedHomeThoughtsContentSchema: z.ZodType<HomeThoughtsContent> =
  z.preprocess((payload) => {
    if (typeof payload !== "object" || payload === null) return payload;
    const { negative, positive, ...rest } = payload as Record<string, unknown>;
    if (!Array.isArray(negative) || !Array.isArray(positive)) return payload;
    const strings = (list: unknown[]) =>
      list.map((item) => (typeof item === "string" ? item.trim() : ""));
    return {
      ...rest,
      pairs: pairLegacyThoughts(strings(negative), strings(positive)),
    };
  }, homeThoughtsContentSchema);

export const defaultHomeThoughts: HomeThoughtsContent = {
  label: "Pod natłokiem trudnych myśli kryją się inne",
  pairs: [
    { negative: "nie dam rady", positive: "Mam prawo tak czuć" },
    { negative: "znowu to samo", positive: "Mam prawo tak czuć" },
    { negative: "co jeśli", positive: "Krok po kroku" },
    { negative: "nie mam siły", positive: "Krok po kroku" },
    { negative: "wstyd", positive: "Mogę poprosić o pomoc" },
    { negative: "lęk", positive: "Mogę poprosić o pomoc" },
    { negative: "a jeśli to moja wina", positive: "Wystarczy, że jestem" },
    { negative: "za mało", positive: "Wystarczy, że jestem" },
    { negative: "nikt mnie nie rozumie", positive: "Zasługuję na spokój" },
    { negative: "pustka", positive: "Zasługuję na spokój" },
    { negative: "nie zasługuję", positive: "To minie" },
    { negative: "muszę", positive: "To minie" },
    { negative: "co pomyślą inni", positive: "Mogę odpocząć" },
    { negative: "złość", positive: "Mogę odpocząć" },
    { negative: "napięcie", positive: "Nie muszę dźwigać wszystkiego" },
    { negative: "nie śpię", positive: "Nie muszę dźwigać wszystkiego" },
    {
      negative: "wszystko na mojej głowie",
      positive: "To, co czuję, jest ważne",
    },
    { negative: "nie wiem, co dalej", positive: "To, co czuję, jest ważne" },
    { negative: "bezsilność", positive: "Oddech po oddechu" },
    { negative: "smutek", positive: "Oddech po oddechu" },
    { negative: "znowu zawiodę", positive: "Mam w sobie siłę" },
    { negative: "chaos", positive: "Mam w sobie siłę" },
    { negative: "nie potrafię", positive: "Wolno mi się mylić" },
    { negative: "porażka", positive: "Wolno mi się mylić" },
    { negative: "nie umiem odpocząć", positive: "Jutro może być lżej" },
    { negative: "zawsze tak będzie", positive: "Jutro może być lżej" },
    { negative: "samotność", positive: "Mam na kogo liczyć" },
    { negative: "boję się", positive: "Mam na kogo liczyć" },
  ],
};

export const HOME_STORY_STEPS_MAX = 4;

export const homeStoryStepSchema = z.strictObject({
  heading: z.string().trim().min(1).max(80),
  text: z.string().trim().min(1).max(400),
  /** Where the step's button leads (none: no button). */
  cta: z
    .strictObject({
      label: z.string().trim().min(1).max(40),
      href: sitePathSchema,
    })
    .nullable()
    .default(null),
  /** The photo, a file in the public site-media bucket (none: the site's). */
  imagePath: z.string().trim().min(1).max(300).nullable().default(null),
  imageAlt: z.string().trim().max(200).default(""),
});

export type HomeStoryStep = z.infer<typeof homeStoryStepSchema>;

/** Home → "Opowieść przy przewijaniu": one to four steps, in order. */
export const homeStoryContentSchema = z.strictObject({
  steps: z.array(homeStoryStepSchema).min(1).max(HOME_STORY_STEPS_MAX),
});

export type HomeStoryContent = z.infer<typeof homeStoryContentSchema>;

/** Until anything is published: the site's steps, with the site's photos. */
export const defaultHomeStory: HomeStoryContent = {
  steps: [
    {
      heading: "Pierwsza rozmowa",
      text: "Zaczynamy od konsultacji: rozmawiamy o tym, z czym przychodzisz i czego potrzebujesz. Nie musisz się do niej specjalnie przygotowywać.",
      cta: { label: "Umów wizytę", href: "/umow-wizyte" },
      imagePath: null,
      imageAlt: "",
    },
    {
      heading: "Przestrzeń, która wspiera",
      text: "Jasne, przytulne gabinety stworzone z myślą o Twoim komforcie i poczuciu bezpieczeństwa.",
      cta: { label: "Zobacz nasze gabinety", href: "/gabinety" },
      imagePath: null,
      imageAlt: "",
    },
    {
      heading: "Wydarzenia, które inspirują",
      text: "Warsztaty, grupy rozwojowe i spotkania tematyczne dla osób, które chcą lepiej siebie rozumieć.",
      cta: { label: "Zobacz nadchodzące wydarzenia", href: "/warsztaty" },
      imagePath: null,
      imageAlt: "",
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
