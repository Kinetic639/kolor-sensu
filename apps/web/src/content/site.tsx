import type {
  BentoItem,
  FaqItem,
  GuidedChoiceSectionProps,
  HeroSectionProps,
  StoryStep,
} from "@repo/ui/public-site";
import {
  Brain,
  CalendarCheck,
  HandHeart,
  Heart,
  HeartHandshake,
  House,
  Leaf,
  LockKeyhole,
  MessagesSquare,
  MonitorSmartphone,
  Phone,
  Sparkles,
  Sprout,
  User,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

// The site's own content: what the database does not hold (yet). Services,
// specialists, the address and the centre's contact details come from
// Supabase (lib/public-data.ts); everything here is copy, edited in this
// file until it moves to the CMS.
//
// To confirm with the centre before launch (taken over from the design's
// sample copy, not verified facts): the opening hours, the FAQ answers
// (session length, cancellation rules, online sessions), the rooms'
// amenities and the "O nas" values. On the homepage also: the steps of a
// first visit, the guided choice's questions and suggestions, and the
// facts in the modular section (online sessions, confidentiality).

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
    caption: "Przestrzeń dla ważnych rozmów",
  },
} satisfies HeroSectionProps;

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

// The homepage's scroll story: the steps of a first visit ("Jak zaczynamy").
export const storySteps = [
  {
    title: "Pierwszy kontakt",
    description:
      "Piszesz albo dzwonisz. Pytamy krótko, czego szukasz, i proponujemy termin, który Ci pasuje.",
  },
  {
    title: "Konsultacja",
    description:
      "Spokojna rozmowa o tym, co Cię sprowadza. Bez oceniania i bez pośpiechu, w gabinecie lub online.",
  },
  {
    title: "Wspólny plan",
    description:
      "Razem wybieramy formę wsparcia i specjalistę. Wiesz, jak często będziemy się spotykać i dlaczego.",
  },
  {
    title: "Regularne spotkania",
    description:
      "Małe kroki, które z czasem składają się w zmianę. W każdej chwili możesz zapytać, gdzie jesteśmy.",
  },
] satisfies StoryStep[];

// "Nie wiesz, od czego zacząć?": the questions. The specialists come from
// the database (lib/guided-choice.ts).
export const guidedChoice = {
  audiences: [
    {
      value: "self",
      label: "Dla siebie",
      image: {
        src: "/images/gabinet-fotel.webp",
        alt: "Jasny gabinet z fotelem przy dużym oknie",
        objectPosition: "55% 50%",
      },
    },
    {
      value: "couple",
      label: "Dla nas, jako pary",
      image: {
        src: "/images/gabinet.jpg",
        alt: "Gabinet z fotelem, stolikiem i roślinami",
        objectPosition: "50% 55%",
      },
    },
    {
      value: "child",
      label: "Dla dziecka lub nastolatka",
      image: {
        src: "/images/warsztaty.jpg",
        alt: "Spotkanie w kręgu w jasnej sali",
        objectPosition: "50% 40%",
      },
    },
  ],
  concerns: [
    { value: "anxiety", label: "Lęk i stres" },
    { value: "mood", label: "Obniżony nastrój" },
    { value: "relations", label: "Relacje i komunikacja" },
    { value: "crisis", label: "Trudne wydarzenie" },
    { value: "growth", label: "Rozwój i samopoznanie" },
  ],
  formats: [
    { value: "office", label: "W gabinecie" },
    { value: "online", label: "Online" },
    { value: "any", label: "Bez różnicy" },
  ],
  bookingHref: bookingCta.href,
} satisfies Omit<GuidedChoiceSectionProps, "specialists" | "id" | "className">;

// The homepage's one modular (bento) section.
export const bento = [
  {
    id: "first-visit",
    size: "wide",
    tone: "blush",
    icon: <CalendarCheck />,
    title: "Bez skierowania",
    description:
      "Termin konsultacji wybierasz sam w kalendarzu online albo przez telefon.",
    more: "Wybierasz usługę, specjalistę i termin w kalendarzu. Jeśli nie wiesz, co wybrać, zacznij od konsultacji albo napisz do nas.",
  },
  {
    id: "online",
    size: "small",
    tone: "sage",
    icon: <MonitorSmartphone />,
    title: "Online albo w gabinecie",
    description: "Tak, jak Ci wygodniej.",
    more: "Przy każdej usłudze i każdym specjaliście widać, czy spotkania mogą odbywać się online.",
  },
  {
    id: "privacy",
    size: "small",
    tone: "cream",
    icon: <LockKeyhole />,
    title: "Poufność",
    description: "Tajemnica zawodowa i bezpieczne dane.",
  },
  {
    id: "crisis",
    size: "small",
    tone: "blush",
    icon: <Phone />,
    title: "W nagłej sytuacji",
    description:
      "Gdy zagrożone jest życie, dzwoń pod 112 albo na całodobowy numer 800 70 2222.",
  },
  {
    id: "growth",
    size: "wide",
    tone: "sage",
    icon: <Sprout />,
    title: "Warsztaty i grupy wsparcia",
    description: "Kameralne spotkania w małych grupach.",
    more: "Warsztaty, grupy rozwojowe i spotkania tematyczne dla osób, które chcą lepiej siebie rozumieć.",
  },
  {
    id: "team",
    size: "small",
    tone: "cream",
    icon: <HandHeart />,
    title: "Zespół, który się zna",
    description: "Psychoterapeuci i psycholodzy, którzy pracują razem.",
  },
] satisfies BentoItem[];

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

// ------------------------------------------------------------ services

type ServiceCategory =
  | "consultation"
  | "psychotherapy"
  | "couples_therapy"
  | "assessment"
  | "workshop_related"
  | "other";

/** The icon of a service tile, by the service's category. */
export const serviceIcons: Record<ServiceCategory, ReactNode> = {
  consultation: <MessagesSquare />,
  psychotherapy: <User />,
  couples_therapy: <Users />,
  assessment: <Brain />,
  workshop_related: <Sparkles />,
  other: <HeartHandshake />,
};

/** Shown on a service's page when it has no description of its own. */
export const serviceFallbackDescription =
  "Szczegóły tej formy wsparcia omówimy podczas pierwszego kontaktu. Zadzwoń lub napisz do nas, a pomożemy dobrać specjalistę i termin.";

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
