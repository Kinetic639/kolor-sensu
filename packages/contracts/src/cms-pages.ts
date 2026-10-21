import { z } from "zod";
import {
  plainHeader,
  sectionHeaderSchema,
} from "@repo/contracts/section-header";
import {
  pageHeader,
  pageHeaderSchema,
  sitePathSchema,
  type PageHeaderContent,
} from "@repo/contracts/cms-shared";

// The CMS's words for the "O nas" pages (docs/architecture/cms-domain.md):
// O nas itself, Specjaliści and Kontakt (Gabinety is the `rooms` key in
// cms.ts), and two settings every page shares ("Ustawienia wspólne"): the
// closing banner and the contact hours. Each defaults to the site's own
// words, so the pages show as they did until the admin publishes others;
// fields added later default too, so content saved before them still reads.
// Only words: the structure, links and look stay in code.

// ----------------------------------------------------------------- O nas

export const ABOUT_VALUES_COUNT = 3;
export const ABOUT_PROFESSIONALISM_MAX = 8;
export const ABOUT_AUDIENCES_MAX = 6;

const valueSchema = z.strictObject({
  title: z.string().trim().min(1).max(60),
  text: z.string().trim().min(1).max(240),
});

const audienceSchema = z.strictObject({
  title: z.string().trim().min(1).max(60),
  text: z.string().trim().max(200),
  /** Where its card leads (the offer by default). */
  href: sitePathSchema,
});

export type AboutAudience = z.infer<typeof audienceSchema>;

export const defaultAboutIntro: PageHeaderContent = pageHeader({
  eyebrow: "Centrum psychoterapii i rozwoju",
  title: "O nas",
  accent: "Spokojnie, uważnie, z sensem.",
  lead: "",
});

export const defaultAboutValues = [
  {
    title: "Bezpieczeństwo",
    text: "Rozmawiamy bez oceniania, w poufności i we własnym tempie.",
  },
  {
    title: "Indywidualne podejście",
    text: "Każdą współpracę zaczynamy od zrozumienia Twojej sytuacji i potrzeb.",
  },
  {
    title: "Profesjonalizm",
    text: "Nasi specjaliści stale się szkolą i pracują pod regularną superwizją.",
  },
];

export const defaultAboutAudiences: AboutAudience[] = [
  {
    title: "Dorośli",
    text: "Psychoterapia i konsultacje indywidualne.",
    href: "/oferta",
  },
  {
    title: "Pary",
    text: "Wsparcie w relacji, kryzysie i zmianie.",
    href: "/oferta",
  },
  {
    title: "Dzieci i młodzież",
    text: "Pomoc dla młodszych i wsparcie dla rodziców.",
    href: "/oferta",
  },
];

/**
 * O nas: the top, the three value cards, and three optional parts the
 * admin switches on once they have their words ("Nasza historia", the
 * concrete facts under "Profesjonalizm", "Z kim pracujemy"), each off until
 * then. An empty lead shows the centre's short description from Ustawienia,
 * else the site's own.
 */
export const aboutPageContentSchema = z.strictObject({
  intro: pageHeaderSchema.default(() => structuredClone(defaultAboutIntro)),
  values: z
    .array(valueSchema)
    .length(ABOUT_VALUES_COUNT)
    .default(() => defaultAboutValues.map((value) => ({ ...value }))),
  showStory: z.boolean().default(false),
  story: z
    .strictObject({
      text: z.string().trim().max(2000),
      /** A photo in the public site-media bucket (folder about). */
      imagePath: z.string().trim().min(1).max(300).nullable(),
      imageAlt: z.string().trim().max(200),
    })
    .default(() => ({ text: "", imagePath: null, imageAlt: "" })),
  showProfessionalism: z.boolean().default(false),
  /** Under the last value card: supervision, ethics code, societies. */
  professionalism: z
    .array(z.string().trim().min(1).max(120))
    .max(ABOUT_PROFESSIONALISM_MAX)
    .default(() => []),
  showAudiences: z.boolean().default(false),
  audiences: z
    .array(audienceSchema)
    .min(1)
    .max(ABOUT_AUDIENCES_MAX)
    .default(() => defaultAboutAudiences.map((one) => ({ ...one }))),
  /** One line under the cards, e.g. where and how sessions take place. */
  audiencesNote: z
    .string()
    .trim()
    .max(160)
    .default("Spotkania stacjonarnie i online."),
});

export type AboutPageContent = z.infer<typeof aboutPageContentSchema>;

export const defaultAboutPage: AboutPageContent = aboutPageContentSchema.parse(
  {},
);

/** O nas's sections with a header the CMS edits, top to bottom. */
export const ABOUT_HEADER_SECTIONS = [
  { key: "story", label: "Nasza historia" },
  { key: "audiences", label: "Z kim pracujemy" },
  { key: "specialists", label: "Nasi specjaliści" },
  { key: "rooms", label: "Gabinety" },
  { key: "contact", label: "Kontakt" },
] as const;

export type AboutHeaderSection = (typeof ABOUT_HEADER_SECTIONS)[number]["key"];

export const aboutHeadersContentSchema = z.strictObject({
  story: sectionHeaderSchema,
  audiences: sectionHeaderSchema,
  specialists: sectionHeaderSchema,
  rooms: sectionHeaderSchema,
  contact: sectionHeaderSchema,
});

export type AboutHeadersContent = z.infer<typeof aboutHeadersContentSchema>;

export const defaultAboutHeaders: AboutHeadersContent = {
  story: plainHeader({
    eyebrow: "Nasza historia",
    title: "Skąd się wzięliśmy",
  }),
  audiences: plainHeader({
    eyebrow: "Z kim pracujemy",
    title: "Wsparcie na różnych etapach życia",
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
  contact: plainHeader({
    eyebrow: "Kontakt",
    title: "Jesteśmy blisko",
    cta: { label: "Przejdź do kontaktu", href: "/kontakt", style: "arrow" },
  }),
};

// ------------------------------------------------------------ Specjaliści

/** /specjalisci: its top, the line for an empty list, the closing banner. */
export const specialistsPageContentSchema = z.strictObject({
  intro: pageHeaderSchema,
  emptyText: z.string().trim().min(1).max(400),
  helpHeading: z.string().trim().min(1).max(120),
});

export type SpecialistsPageContent = z.infer<
  typeof specialistsPageContentSchema
>;

export const defaultSpecialistsPage: SpecialistsPageContent = {
  intro: pageHeader({
    eyebrow: "Nasi specjaliści",
    title: "Specjaliści",
    accent: "Ludzie, którzy słuchają.",
    lead: "Doświadczony zespół specjalistów, którzy z empatią i zaangażowaniem towarzyszą w drodze do lepszego samopoczucia.",
  }),
  emptyText:
    "Profile naszych specjalistów pojawią się tu wkrótce. Zadzwoń lub napisz do nas, a pomożemy dobrać osobę i termin.",
  helpHeading: "Nie wiesz, do kogo się zapisać? Pomożemy wybrać.",
};

// ---------------------------------------------------------------- Edukacja

/**
 * /edukacja and its articles: the top of /edukacja, the line while nothing
 * is published, the top of /edukacja/artykuly, and the word about therapy
 * under every article.
 */
export const educationPageContentSchema = z.strictObject({
  intro: pageHeaderSchema,
  emptyText: z.string().trim().min(1).max(400),
  articlesIntro: pageHeaderSchema,
  therapyNote: z.string().trim().min(1).max(600),
});

export type EducationPageContent = z.infer<typeof educationPageContentSchema>;

export const defaultEducationPage: EducationPageContent = {
  intro: pageHeader({
    eyebrow: "Edukacja",
    title: "Edukacja",
    accent: "Wiedza, która pomaga zrozumieć.",
    lead: "Dzielimy się wiedzą o zdrowiu psychicznym, emocjach i relacjach: przystępnie, rzetelnie i bez oceniania.",
  }),
  emptyText:
    "Przygotowujemy artykuły i materiały edukacyjne. Jeśli masz pytanie, z którym chcesz przyjść już teraz, zadzwoń lub napisz do nas.",
  articlesIntro: pageHeader({
    eyebrow: "Edukacja",
    title: "Artykuły",
    accent: "",
    lead: "Przystępnie o emocjach, relacjach i zdrowiu psychicznym, pisane przez naszych specjalistów.",
  }),
  therapyNote:
    "Artykuł ma charakter edukacyjny i nie zastępuje konsultacji ze specjalistą. Jeśli to, o czym czytasz, dotyczy Ciebie lub bliskiej osoby, umów się na rozmowę. Jeśli czujesz, że Twoje życie jest zagrożone, od razu szukaj pomocy.",
};

// ---------------------------------------------------------------- Kontakt

export const CONTACT_FAQ_MAX = 12;

const faqItemSchema = z.strictObject({
  question: z.string().trim().min(1).max(160),
  answer: z.string().trim().min(1).max(1200),
});

export type ContactFaqItem = z.infer<typeof faqItemSchema>;

export const defaultContactFaq: ContactFaqItem[] = [
  {
    question: "Jak wygląda pierwsza wizyta?",
    answer:
      "Pierwsze spotkanie to konsultacja: rozmawiamy o tym, z czym przychodzisz, czego potrzebujesz i jaka forma pomocy będzie najlepsza. Nie musisz się do niej specjalnie przygotowywać.",
  },
  {
    question: "Ile trwa sesja i jak często się spotykamy?",
    answer:
      "Sesja trwa zwykle 50 minut. Najczęściej spotykamy się raz w tygodniu, ale częstotliwość ustalamy wspólnie z terapeutą.",
  },
  {
    question: "Czy potrzebuję skierowania?",
    answer:
      "Nie. Na psychoterapię i konsultacje psychologiczne możesz umówić się bez skierowania.",
  },
  {
    question: "Czy możliwe są spotkania online?",
    answer:
      "Tak. Część specjalistów prowadzi sesje online; informację znajdziesz w opisie usługi i przy każdym specjaliście.",
  },
  {
    question: "Jak mogę odwołać lub przełożyć wizytę?",
    answer:
      "Najpóźniej 24 godziny przed spotkaniem, telefonicznie lub mailowo. Wizyta odwołana później jest płatna.",
  },
];

/**
 * /kontakt: its top, how to get there (public transport, parking, the
 * entrance), the form's heading and its questions and answers.
 */
export const contactPageContentSchema = z.strictObject({
  intro: pageHeaderSchema,
  travel: z.string().trim().max(1000),
  formHeading: z.string().trim().min(1).max(120),
  faqHeading: z.string().trim().min(1).max(120),
  faq: z.array(faqItemSchema).max(CONTACT_FAQ_MAX),
});

export type ContactPageContent = z.infer<typeof contactPageContentSchema>;

export const defaultContactPage: ContactPageContent = {
  intro: pageHeader({
    eyebrow: "Kontakt",
    title: "Kontakt",
    accent: "Jesteśmy tu dla Ciebie.",
    lead: "Zadzwoń lub napisz. Odpowiemy na pytania, pomożemy dobrać specjalistę i znaleźć termin.",
  }),
  travel: "",
  formHeading: "Napisz do nas",
  faqHeading: "Zanim zadzwonisz",
  faq: defaultContactFaq,
};

// ------------------------------------------------------ Ustawienia wspólne

/** The closing banner on many pages ("Zrób pierwszy krok…"). */
export const closingCtaContentSchema = z.strictObject({
  heading: z.string().trim().min(1).max(120),
  bookingLabel: z.string().trim().min(1).max(40),
  contactLabel: z.string().trim().min(1).max(40),
});

export type ClosingCtaContent = z.infer<typeof closingCtaContentSchema>;

export const defaultClosingCta: ClosingCtaContent = {
  heading: "Zrób pierwszy krok do lepszego samopoczucia",
  bookingLabel: "Umów wizytę",
  contactLabel: "Skontaktuj się",
};

/** Contact details the company settings do not hold: the hours. */
export const siteContactContentSchema = z.strictObject({
  /** As shown in the footer, on Kontakt and in "Gdzie jesteśmy". */
  hours: z.string().trim().max(160),
});

export type SiteContactContent = z.infer<typeof siteContactContentSchema>;

export const defaultSiteContact: SiteContactContent = {
  hours: "Pn–Pt 8:00–20:00, sob. 9:00–14:00",
};
