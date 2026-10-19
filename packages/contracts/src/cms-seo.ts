import { z } from "zod";

/**
 * Every public page's search and sharing settings (one site_content row
 * per page, `seo_<page>`; docs/architecture/cms-domain.md): the title and
 * description Google shows, the title, description and picture a shared
 * link shows, and whether search engines may index the page. Each field
 * is optional: an empty text is the page's own default (below), no
 * picture is the site's generated one (each page's opengraph-image).
 */

/** The site's name, after every page's own title (as in the site's layout). */
export const SEO_SITE_NAME = "Kolor Sensu";

/** Google shows about this many characters of a title, and of a description. */
export const SEO_TITLE_RECOMMENDED = 60;
export const SEO_DESCRIPTION_RECOMMENDED = 160;

/**
 * The static pages with their address, their name in the admin and their
 * defaults: the page's own title (the site adds " | Kolor Sensu"; the
 * homepage's is whole) and description.
 */
export const SEO_PAGES = [
  {
    page: "home",
    path: "/",
    label: "Strona główna",
    title: `${SEO_SITE_NAME} | Centrum psychoterapii i rozwoju`,
    description:
      "Kolor Sensu to centrum psychoterapii i rozwoju w Poznaniu. Psychoterapia indywidualna, par, dzieci i młodzieży oraz konsultacje psychologiczne w spokojnej, bezpiecznej przestrzeni.",
  },
  {
    page: "about",
    path: "/o-nas",
    label: "O nas",
    title: "O nas",
    description:
      "Kolor Sensu to zespół psychoterapeutów i psychologów, którzy pracują z dorosłymi, parami, dziećmi i młodzieżą.",
  },
  {
    page: "offer",
    path: "/oferta",
    label: "Oferta",
    title: "Oferta",
    description:
      "Psychoterapia indywidualna, terapia par, wsparcie dzieci i młodzieży oraz konsultacje psychologiczne w Kolor Sensu.",
  },
  {
    page: "specialists",
    path: "/specjalisci",
    label: "Specjaliści",
    title: "Specjaliści",
    description:
      "Poznaj psychoterapeutów i psychologów Kolor Sensu: ich doświadczenie, podejście i formy pracy.",
  },
  {
    page: "prices",
    path: "/cennik",
    label: "Cennik",
    title: "Cennik",
    description:
      "Ceny konsultacji, psychoterapii i terapii par w Kolor Sensu, u każdego ze specjalistów.",
  },
  {
    page: "rooms",
    path: "/gabinety",
    label: "Gabinety",
    title: "Gabinety",
    description:
      "Jasne, ciche i przytulne gabinety Kolor Sensu, stworzone z myślą o komforcie i poczuciu bezpieczeństwa.",
  },
  {
    page: "workshops",
    path: "/warsztaty",
    label: "Warsztaty",
    title: "Warsztaty",
    description:
      "Warsztaty, grupy rozwojowe i spotkania tematyczne w Kolor Sensu.",
  },
  {
    page: "education",
    path: "/edukacja",
    label: "Edukacja",
    title: "Edukacja",
    description:
      "Wiedza o zdrowiu psychicznym, emocjach i relacjach od specjalistów Kolor Sensu.",
  },
  {
    page: "contact",
    path: "/kontakt",
    label: "Kontakt",
    title: "Kontakt",
    description:
      "Adres, telefon, e-mail i godziny otwarcia Kolor Sensu. Zadzwoń lub napisz, a pomożemy dobrać specjalistę i termin.",
  },
  {
    page: "booking",
    path: "/umow-wizyte",
    label: "Umów wizytę",
    title: "Umów wizytę",
    description:
      "Umów wizytę w Kolor Sensu: wybierz usługę, formę spotkania, specjalistę i wolny termin.",
  },
  {
    page: "crisis_help",
    path: "/pomoc-w-kryzysie",
    label: "Pomoc w kryzysie",
    title: "Pomoc w kryzysie",
    description:
      "Gdy Twoje życie lub zdrowie jest w zagrożeniu, zadzwoń pod 112. Bezpłatne, całodobowe telefony wsparcia w kryzysie psychicznym.",
  },
  {
    page: "privacy",
    path: "/polityka-prywatnosci",
    label: "Polityka prywatności",
    title: "Polityka prywatności",
    description: "Jak Kolor Sensu przetwarza dane osobowe.",
  },
  {
    page: "terms",
    path: "/regulamin",
    label: "Regulamin",
    title: "Regulamin",
    description: "Zasady korzystania z usług Kolor Sensu.",
  },
  {
    page: "cookies",
    path: "/cookies",
    label: "Pliki cookies",
    title: "Pliki cookies",
    description: "Jak strona Kolor Sensu używa plików cookies.",
  },
] as const;

export type SeoPage = (typeof SEO_PAGES)[number]["page"];
export type SeoPageDefinition = (typeof SEO_PAGES)[number];

/** The site_content key of a page's settings. */
export function seoContentKey(page: SeoPage): `seo_${SeoPage}` {
  return `seo_${page}`;
}

export function seoPageDefinition(page: SeoPage): SeoPageDefinition {
  const found = SEO_PAGES.find((one) => one.page === page);
  if (!found) throw new Error(`Unknown page: ${page}`);
  return found;
}

/** The page's whole default title, as Google shows it. */
export function defaultSeoTitle(page: SeoPage): string {
  const { title } = seoPageDefinition(page);
  return page === "home" ? title : `${title} | ${SEO_SITE_NAME}`;
}

export const pageSeoContentSchema = z
  .strictObject({
    /** The whole title Google shows (none: the page's own). */
    title: z.string().trim().max(120).default(""),
    description: z.string().trim().max(320).default(""),
    /** A shared link's title and description (none: the two above). */
    ogTitle: z.string().trim().max(120).default(""),
    ogDescription: z.string().trim().max(320).default(""),
    /** A shared link's picture, in the public site-media bucket. */
    ogImagePath: z.string().trim().min(1).max(300).nullable().default(null),
    ogImageAlt: z.string().trim().max(200).default(""),
    /** Keep the page out of search engines and the sitemap. */
    noindex: z.boolean().default(false),
  })
  .refine((seo) => !seo.ogImagePath || seo.ogImageAlt.length > 0, {
    message: "Opisz obrazek w kilku słowach",
    path: ["ogImageAlt"],
  });

export type PageSeoContent = z.infer<typeof pageSeoContentSchema>;

/** Until anything is published: every page its own. */
export const defaultPageSeo: PageSeoContent = {
  title: "",
  description: "",
  ogTitle: "",
  ogDescription: "",
  ogImagePath: null,
  ogImageAlt: "",
  noindex: false,
};

/** A page's settings with its defaults filled in: what the site shows. */
export interface ResolvedPageSeo {
  path: string;
  /** The whole title (none of the site's template is added to it). */
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogImagePath: string | null;
  ogImageAlt: string;
  noindex: boolean;
}

export function resolvePageSeo(
  page: SeoPage,
  content: PageSeoContent | null,
): ResolvedPageSeo {
  const seo = content ?? defaultPageSeo;
  const definition = seoPageDefinition(page);
  const title = seo.title || defaultSeoTitle(page);
  const description = seo.description || definition.description;
  return {
    path: definition.path,
    title,
    description,
    ogTitle: seo.ogTitle || title,
    ogDescription: seo.ogDescription || description,
    ogImagePath: seo.ogImagePath,
    ogImageAlt: seo.ogImagePath ? seo.ogImageAlt : "",
    noindex: seo.noindex,
  };
}
