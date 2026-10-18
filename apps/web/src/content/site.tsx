import {
  type FaqItem,
  type HeroSectionProps,
  type PaintedStoryStep,
  PenguinLoader,
} from "@repo/ui/public-site";
import type { PublicSupportArea } from "@repo/supabase";
import { Heart, House, Leaf, Users } from "lucide-react";
import type { ReactNode } from "react";

// The site's own content: what the database does not hold (yet). Services,
// specialists, the address and the centre's contact details come from
// Supabase (lib/public-data.ts); everything here is copy, edited in this
// file until it moves to the CMS.
//
// To confirm with the centre before launch (taken over from the design's
// sample copy, not verified facts): the opening hours, the FAQ answers
// (session length, cancellation rules, online sessions), the rooms'
// amenities and the "O nas" values.

export const siteName = "Kolor Sensu";
export const siteTagline = "Centrum psychoterapii i rozwoju";

/**
 * The site's origin, for canonical URLs, sitemaps and structured data
 * (NEXT_PUBLIC_WEB_URL, .env.example).
 */
export const siteUrl = (
  process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

export const siteDescription =
  "Kolor Sensu to centrum psychoterapii i rozwoju w Poznaniu. Psychoterapia indywidualna, par, dzieci i młodzieży oraz konsultacje psychologiczne w spokojnej, bezpiecznej przestrzeni.";

/** Short "about" line of the footer; the centre's profile overrides it. */
export const footerAbout =
  "Centrum psychoterapii i rozwoju. Psychoterapia indywidualna, par, dzieci i młodzieży w spokojnej, bezpiecznej przestrzeni.";

/** Opening hours as shown in the footer and on the contact page. */
export const openingHours = "Pn–Pt 8:00–20:00, sob. 9:00–14:00";

export const bookingCta = { label: "Umów wizytę", href: "/umow-wizyte" };

export const legalLinks = [
  { label: "Polityka prywatności", href: "/polityka-prywatnosci" },
  { label: "Regulamin", href: "/regulamin" },
  { label: "Cookies", href: "/cookies" },
];

// ------------------------------------------------------------------ home

export const hero = {
  eyebrow: siteTagline,
  heading: "Więcej zrozumienia.",
  accent: "Więcej sensu.",
  description:
    "Psychoterapia, rozwój i wsparcie w bezpiecznej przestrzeni. Dla osób dorosłych, par, dzieci i młodzieży.",
  primaryAction: bookingCta,
  secondaryAction: { label: "Poznaj nas", href: "/o-nas" },
  points: [
    { icon: <Leaf />, label: "Doświadczeni specjaliści" },
    { icon: <Users />, label: "Indywidualne podejście" },
    { icon: <House />, label: "Przytulne gabinety" },
    { icon: <Heart />, label: "Atmosfera zaufania", tone: "pink" },
  ],
  image: {
    src: "/images/gabinet-fotel.webp",
    alt: "Jasny gabinet z fotelem, stolikiem i roślinami przy dużym oknie",
    mark: <PenguinLoader />,
  },
} satisfies HeroSectionProps;

// The thoughts under the hero are the CMS's (defaultHomeThoughts in the
// contracts until published).

// Home → Obszary wsparcia: the section's own words; the areas themselves
// come from the CMS once published, these until then (same as the CMS's
// starting draft, plus the site's photos).
export const supportAreasCopy = {
  eyebrow: "Obszary wsparcia",
  heading: "W czym możemy pomóc",
  description:
    "Wybierz koło, aby zobaczyć, czym zajmujemy się w każdym z obszarów.",
};

export const defaultSupportAreas = [
  {
    id: "indywidualna",
    title: "Terapia indywidualna",
    lead: "Spotkania jeden na jeden, w Twoim tempie: o tym, co trudne, i o tym, czego potrzebujesz.",
    image: {
      src: "/images/gabinet-fotel.webp",
      alt: "Jasny gabinet z fotelem i roślinami",
    },
    link: null,
  },
  {
    id: "pary",
    title: "Terapia dla par",
    lead: "Wspólna przestrzeń, by lepiej się słyszeć, rozumieć i szukać porozumienia.",
    image: { src: "/images/gabinet.jpg", alt: "Gabinet z dwoma fotelami" },
    link: null,
  },
  {
    id: "mlodziez",
    title: "Wsparcie dzieci i młodzieży",
    lead: "Pomoc dla młodszych osób i ich rodziców: w trudnych emocjach, w szkole i w relacjach.",
    image: null,
    link: null,
  },
  {
    id: "rodzinna",
    title: "Terapia rodzinna",
    lead: "Praca z całą rodziną nad tym, co dzieje się między jej członkami.",
    image: null,
    link: null,
  },
  {
    id: "warsztaty",
    title: "Warsztaty i rozwój",
    lead: "Grupy i spotkania tematyczne dla osób, które chcą lepiej siebie poznać.",
    image: {
      src: "/images/warsztaty.jpg",
      alt: "Uczestnicy warsztatu rozmawiają w kręgu",
    },
    link: { href: "/warsztaty", label: "Zobacz warsztaty" },
  },
] satisfies PublicSupportArea[];

export const offerCopy = {
  eyebrow: "Nasza oferta",
  heading: "Wsparcie w różnych obszarach życia",
  description:
    "Oferujemy terapię, konsultacje i warsztaty dopasowane do Twoich potrzeb.",
};

export const specialistsCopy = {
  eyebrow: "Nasi specjaliści",
  heading: "Poznaj nasz zespół",
  description:
    "Doświadczony zespół specjalistów, którzy z empatią i zaangażowaniem towarzyszą w drodze do lepszego samopoczucia.",
};

export const rooms = {
  eyebrow: "Nasze gabinety",
  heading: "Przestrzeń, która wspiera",
  description:
    "Jasne, przytulne gabinety stworzone z myślą o Twoim komforcie i poczuciu bezpieczeństwa.",
  image: {
    src: "/images/gabinet.jpg",
    alt: "Gabinet z beżowym fotelem, stolikiem i roślinami",
  },
};

export const workshops = {
  eyebrow: "Warsztaty i rozwój",
  heading: "Wydarzenia, które inspirują",
  description:
    "Warsztaty, grupy rozwojowe i spotkania tematyczne dla osób, które chcą lepiej siebie rozumieć.",
  image: {
    src: "/images/warsztaty.jpg",
    alt: "Uczestnicy warsztatu rozmawiają w kręgu",
  },
};

// The homepage's scroll story (PaintedStory): its steps are the CMS's
// (defaultHomeStory until published); a step without its own photo takes
// one of these, in turn.
export const storyImages = [
  rooms.image,
  hero.image,
  workshops.image,
] satisfies PaintedStoryStep["image"][];

export const closingCta = "Zrób pierwszy krok do lepszego samopoczucia";

export const faq = [
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
] satisfies FaqItem[];

// --------------------------------------------------------------- pages

export const about = {
  heading: "O nas",
  accent: "Spokojnie, uważnie, z sensem.",
  lead: "Kolor Sensu to miejsce, w którym można zatrzymać się, poukładać myśli i znaleźć wsparcie. Tworzymy zespół psychoterapeutów i psychologów, którzy pracują z dorosłymi, parami, dziećmi i młodzieżą.",
  values: [
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
  ],
};

export const roomsPage = {
  heading: "Gabinety",
  accent: "Przestrzeń dla ważnych rozmów.",
  lead: "Nasze gabinety są jasne, ciche i przytulne. Zadbaliśmy o to, żeby już od progu łatwiej było odetchnąć i poczuć się bezpiecznie.",
  points: [
    "Wygodne fotele i spokojne, naturalne kolory",
    "Dobra izolacja akustyczna: rozmowa zostaje w gabinecie",
    "Poczekalnia z herbatą i wodą",
    "Dogodny dojazd w centrum miasta",
  ],
};

export const workshopsPage = {
  heading: "Warsztaty",
  accent: "Rozwój w dobrym towarzystwie.",
  lead: "Prowadzimy warsztaty, grupy rozwojowe i spotkania tematyczne. Nowe terminy ogłaszamy z wyprzedzeniem; zapytaj nas o najbliższe wydarzenia.",
  empty:
    "Obecnie nie mamy zaplanowanych wydarzeń. Zostaw nam wiadomość, a damy znać, gdy pojawią się nowe terminy.",
};

export const educationPage = {
  eyebrow: "Edukacja",
  heading: "Edukacja",
  accent: "Wiedza, która pomaga zrozumieć.",
  lead: "Tu będziemy dzielić się wiedzą o zdrowiu psychicznym, emocjach i relacjach: przystępnie, rzetelnie i bez oceniania.",
  description:
    "Wiedza o zdrowiu psychicznym, emocjach i relacjach od specjalistów Kolor Sensu.",
  soonHeading: "Pierwsze materiały już wkrótce",
  soon: "Przygotowujemy artykuły i materiały edukacyjne. Jeśli masz pytanie, z którym chcesz przyjść już teraz, zadzwoń lub napisz do nas.",
};

export const bookingPage = {
  heading: "Umów wizytę",
  accent: "Pierwszy krok jest najważniejszy.",
  lead: "Najprościej umówić się telefonicznie lub mailowo. Pomożemy dobrać specjalistę i termin, a na pierwszym spotkaniu spokojnie porozmawiamy o tym, czego potrzebujesz.",
  steps: [
    {
      title: "Skontaktuj się z nami",
      text: "Zadzwoń lub napisz. Wystarczy kilka słów o tym, z czym przychodzisz.",
    },
    {
      title: "Dobierzemy specjalistę",
      text: "Zaproponujemy osobę i termin dopasowane do Twoich potrzeb.",
    },
    {
      title: "Pierwsze spotkanie",
      text: "Konsultacja, na której wspólnie ustalimy dalszą formę pomocy.",
    },
  ],
};

export const legalPages = {
  "polityka-prywatnosci": {
    title: "Polityka prywatności",
    description: "Jak Kolor Sensu przetwarza dane osobowe.",
  },
  regulamin: {
    title: "Regulamin",
    description: "Zasady korzystania z usług Kolor Sensu.",
  },
  cookies: {
    title: "Pliki cookies",
    description: "Jak strona Kolor Sensu używa plików cookies.",
  },
} as const;
