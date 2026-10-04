import type { FaqItem } from "./faq-section";
import type {
  SiteContact,
  SiteLink,
  SiteNavItem,
  SiteSocial,
} from "./site-types";

// Sample site data for Storybook and examples (reference A's header and
// footer). Not product data: the app loads the real values.

export const sampleNavigation = [
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
    children: [
      {
        label: "Psychoterapia",
        href: "/oferta#psychoterapia",
        children: [
          {
            label: "Psychoterapia indywidualna",
            href: "/oferta/psychoterapia-indywidualna",
          },
          {
            label: "Psychoterapia par",
            href: "/oferta/psychoterapia-par",
          },
        ],
      },
      {
        label: "Wsparcie dla dzieci i młodzieży",
        href: "/oferta/dzieci-i-mlodziez",
        description: "Zrozumienie, rozwój, bezpieczeństwo.",
      },
      {
        label: "Konsultacje psychologiczne",
        href: "/oferta/konsultacje",
        description: "Pierwszy krok do zmiany.",
      },
    ],
  },
  { label: "Warsztaty", href: "/warsztaty" },
  { label: "Edukacja", href: "/edukacja" },
] as const satisfies readonly SiteNavItem[];

export const sampleCta = {
  label: "Umów wizytę",
  href: "/umow-wizyte",
} satisfies SiteLink;

export const sampleContact = {
  address: {
    street: "ul. Przykładowa 10",
    postalCode: "00-001",
    city: "Warszawa",
  },
  phone: "+48123456789",
  phoneLabel: "+48 123 456 789",
  email: "kontakt@kolorsensu.pl",
  hours: "Pn–Pt 8:00–20:00, sob. 9:00–14:00",
} satisfies SiteContact;

export const sampleSocials = [
  { network: "instagram", href: "https://instagram.com/" },
  { network: "facebook", href: "https://facebook.com/" },
  { network: "linkedin", href: "https://linkedin.com/" },
  { network: "youtube", href: "https://youtube.com/" },
] as const satisfies readonly SiteSocial[];

export const sampleLegal = [
  { label: "Polityka prywatności", href: "/polityka-prywatnosci" },
  { label: "Regulamin", href: "/regulamin" },
  { label: "Cookies", href: "/cookies" },
] as const satisfies readonly SiteLink[];

export const sampleAbout =
  "Centrum psychoterapii i rozwoju w Warszawie. Psychoterapia indywidualna, par, dzieci i młodzieży w spokojnej, bezpiecznej przestrzeni.";

export const sampleFaq = [
  {
    question: "Jak wygląda pierwsza wizyta?",
    answer:
      "Pierwsze spotkanie to konsultacja: rozmawiamy o tym, z czym przychodzisz, czego potrzebujesz i jaka forma pomocy będzie najlepsza. Nie musisz się do niej specjalnie przygotowywać.",
  },
  {
    question: "Ile trwa sesja i jak często się spotykamy?",
    answer:
      "Sesja trwa 50 minut. Najczęściej spotykamy się raz w tygodniu, ale częstotliwość ustalamy wspólnie z terapeutą.",
  },
  {
    question: "Czy potrzebuję skierowania?",
    answer:
      "Nie. Na psychoterapię i konsultacje psychologiczne możesz umówić się bez skierowania.",
  },
  {
    question: "Czy możliwe są spotkania online?",
    answer:
      "Tak. Część specjalistów prowadzi sesje online; informację znajdziesz przy każdym specjaliście.",
  },
  {
    question: "Jak mogę odwołać lub przełożyć wizytę?",
    answer:
      "Najpóźniej 24 godziny przed spotkaniem, telefonicznie lub mailowo. Wizyta odwołana później jest płatna.",
  },
] as const satisfies readonly FaqItem[];
