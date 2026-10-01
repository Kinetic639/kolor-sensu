import type {
  CrisisLine,
  FaqItem,
  HeroSectionProps,
  Topic,
} from "@repo/ui/public-site";
import {
  Brain,
  Heart,
  HeartHandshake,
  House,
  Leaf,
  MessagesSquare,
  Sparkles,
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

/**
 * The homepage's scroll story (PaintedStory): how help here begins, in
 * three steps. The rooms' step shows a published room photo when there is
 * one (app/page.tsx).
 */
export const story = {
  eyebrow: "Jak zacząć",
  heading: "Twoja droga do lepszego samopoczucia",
  steps: [
    {
      heading: "Pierwsza rozmowa",
      text: "Zaczynamy od konsultacji: rozmawiamy o tym, z czym przychodzisz i czego potrzebujesz. Nie musisz się do niej specjalnie przygotowywać.",
      cta: bookingCta,
      image: rooms.image,
    },
    {
      heading: rooms.heading,
      text: rooms.description,
      cta: { href: "/gabinety", label: "Zobacz nasze gabinety" },
      image: hero.image,
    },
    {
      heading: workshops.heading,
      text: workshops.description,
      cta: { href: "/warsztaty", label: "Zobacz nadchodzące wydarzenia" },
      image: workshops.image,
    },
  ],
};

/**
 * "Z czym przychodzisz?" (TopicGuide): the common reasons people come,
 * each with a few words and the same way to start: a first consultation.
 */
export const topicsCopy = {
  eyebrow: "Z czym przychodzisz?",
  heading: "Nie musisz wiedzieć, od czego zacząć",
  description:
    "Wybierz to, co jest Ci teraz najbliższe. Na pierwszej rozmowie wspólnie ułożymy resztę.",
  action: { label: "Umów pierwszą rozmowę", href: "/umow-wizyte" },
  more: { label: "Zobacz ofertę", href: "/oferta" },
};

export const topics = [
  {
    label: "Lęk",
    title: "Gdy niepokój nie odpuszcza",
    text: "Napięcie, natłok myśli, ataki paniki, trudność z zaśnięciem. Razem szukamy źródeł lęku i sposobów, by znów poczuć grunt pod nogami.",
    paint: "pink-1",
  },
  {
    label: "Nastrój",
    title: "Gdy wszystko jest szare",
    text: "Smutek, brak energii, poczucie, że nic nie cieszy. Psychoterapia pomaga zrozumieć, co się dzieje, i odzyskać siły krok po kroku.",
    paint: "sage-1",
  },
  {
    label: "Relacje",
    title: "Gdy trudno się porozumieć",
    text: "Kłótnie, oddalenie, powracające konflikty w związku lub rodzinie. Pracujemy indywidualnie i z parami.",
    paint: "pink-2",
  },
  {
    label: "Dziecko",
    title: "Gdy martwisz się o dziecko",
    text: "Zmiany w zachowaniu, trudne emocje, problemy w szkole. Wspieramy dzieci, młodzież i ich rodziców.",
    paint: "sage-2",
  },
  {
    label: "Wypalenie",
    title: "Gdy brakuje sił na codzienność",
    text: "Przeciążenie pracą i obowiązkami, ciągłe zmęczenie, poczucie, że działasz na rezerwie. Uczymy się zatrzymać i zadbać o siebie.",
    paint: "pink-1",
  },
  {
    label: "Strata",
    title: "Gdy przeżywasz żałobę",
    text: "Śmierć bliskiej osoby, rozstanie, utrata zdrowia lub pracy. Dajemy przestrzeń, w której można przejść przez to we własnym tempie.",
    paint: "sage-1",
  },
  {
    label: "Samoocena",
    title: "Gdy krytykujesz się bez końca",
    text: "Poczucie, że nie jesteś wystarczająco dobra lub dobry, porównywanie się z innymi. Budujemy łagodniejsze spojrzenie na siebie.",
    paint: "pink-2",
  },
  {
    label: "Zmiana",
    title: "Gdy życie skręca",
    text: "Przeprowadzka, nowa praca, rodzicielstwo, koniec ważnego etapu. Pomagamy odnaleźć się w tym, co nowe.",
    paint: "sage-2",
  },
] satisfies Topic[];

export const roomsStripCopy = {
  eyebrow: "Nasze gabinety",
  heading: "Zajrzyj do środka",
  cta: { label: "Zobacz gabinety", href: "/gabinety" },
};

export const slotsCopy = {
  eyebrow: "Najbliższe wolne terminy",
  heading: "Możemy spotkać się już wkrótce",
  description:
    "Wybierz termin, a przeprowadzimy Cię przez rezerwację. Inne godziny znajdziesz w kalendarzu.",
  cta: { label: "Zobacz wszystkie terminy", href: "/umow-wizyte" },
};

export const pricesCopy = {
  eyebrow: "Cennik",
  heading: "Jasno i bez niespodzianek",
  description:
    "Cena zależy od formy wsparcia i specjalisty. Tu najniższe ceny każdej usługi, a w pełnym cenniku ceny u poszczególnych specjalistów.",
  forms: [
    {
      title: "W gabinecie",
      text: "Spotkanie w jednym z naszych spokojnych, jasnych gabinetów.",
    },
    {
      title: "Online",
      text: "Rozmowa wideo z domu lub z dowolnego miejsca, w którym czujesz się swobodnie.",
    },
  ],
  cta: { label: "Pełny cennik", href: "/cennik" },
};

/** Crisis numbers (Poland), always shown on the homepage. */
export const crisis = {
  heading: "Potrzebujesz pomocy teraz?",
  description:
    "Nie jesteśmy placówką interwencji kryzysowej. Jeśli Twoje życie lub zdrowie jest zagrożone, zadzwoń:",
  lines: [
    { number: "112", label: "numer alarmowy" },
    { number: "116 123", label: "wsparcie dla dorosłych w kryzysie" },
    { number: "116 111", label: "telefon zaufania dla dzieci i młodzieży" },
    { number: "800 70 2222", label: "Centrum Wsparcia, całodobowo" },
  ],
} satisfies { heading: string; description: string; lines: CrisisLine[] };

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
