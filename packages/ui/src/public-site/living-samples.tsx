import {
  CalendarCheck,
  HandHeart,
  LockKeyhole,
  MessageCircle,
  MonitorSmartphone,
  Sprout,
} from "lucide-react";
import type { BentoItem } from "./bento-section";
import type { GuidedChoiceSectionProps } from "./guided-choice-section";
import type { StoryStep } from "./story-steps-section";

// Sample content of the "living" homepage (Storybook only). Not product
// copy or data decisions.

export const sampleStorySteps = [
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
] as const satisfies readonly StoryStep[];

export const sampleGuidedChoice = {
  audiences: [
    {
      value: "self",
      label: "Dla siebie",
      image: {
        src: "/kolor-sensu/room.jpg",
        alt: "Fotel w jasnym gabinecie przy oknie z widokiem na drzewa",
        objectPosition: "60% 50%",
      },
    },
    {
      value: "couple",
      label: "Dla nas, jako pary",
      image: {
        src: "/kolor-sensu/therapy-room-upload.png",
        alt: "Gabinet z dwoma fotelami i stolikiem",
        objectPosition: "55% 55%",
      },
    },
    {
      value: "child",
      label: "Dla dziecka lub nastolatka",
      image: {
        src: "/kolor-sensu/group.jpg",
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
  specialists: [
    {
      name: "Anna Nowak",
      role: "Psychoterapeutka",
      href: "#anna-nowak",
      portraitSrc: "/kolor-sensu/anna.jpg",
      audiences: ["self", "couple"],
      concerns: ["anxiety", "mood", "relations", "crisis"],
      online: true,
    },
    {
      name: "Tomasz Wójcik",
      role: "Psycholog",
      href: "#tomasz-wojcik",
      portraitSrc: "/kolor-sensu/tomasz.jpg",
      audiences: ["self", "child"],
      concerns: ["anxiety", "growth", "crisis"],
      online: true,
    },
    {
      name: "Katarzyna Zielińska",
      role: "Psychoterapeutka dzieci i młodzieży",
      href: "#katarzyna-zielinska",
      portraitSrc: "/kolor-sensu/kasia.jpg",
      audiences: ["child", "couple"],
      concerns: ["mood", "relations", "crisis", "growth"],
      online: false,
    },
  ],
  bookingHref: "#umow-wizyte",
} satisfies Omit<GuidedChoiceSectionProps, "id" | "className">;

export const sampleBento = [
  {
    id: "first-visit",
    size: "wide",
    tone: "blush",
    icon: <CalendarCheck />,
    stat: "7 dni",
    title: "Tyle zwykle czekasz na pierwszą konsultację",
    more: "Jeśli sprawa jest pilna, napisz to w wiadomości: staramy się znaleźć termin jeszcze w tym samym tygodniu. W sytuacji zagrożenia życia dzwoń pod 112.",
  },
  {
    id: "online",
    size: "small",
    tone: "sage",
    icon: <MonitorSmartphone />,
    title: "Online albo w gabinecie",
    description: "Tak, jak Ci wygodniej. Formę można zmieniać w trakcie.",
    more: "Spotkania online odbywają się przez szyfrowane połączenie wideo. Link dostajesz dzień wcześniej, nie trzeba niczego instalować.",
  },
  {
    id: "privacy",
    size: "small",
    tone: "cream",
    icon: <LockKeyhole />,
    title: "Poufność",
    description: "Tajemnica zawodowa i bezpieczne dane.",
    more: "Specjaliści pracują pod superwizją i są związani tajemnicą zawodową. Notatki i dane kontaktowe przechowujemy wyłącznie w zabezpieczonym systemie.",
  },
  {
    id: "quote",
    size: "small",
    tone: "blush",
    icon: <MessageCircle />,
    quote:
      "Pierwszy raz wyszłam z gabinetu z poczuciem, że ktoś naprawdę słuchał.",
    author: "Pacjentka, 34 lata",
  },
  {
    id: "growth",
    size: "wide",
    tone: "sage",
    icon: <Sprout />,
    title: "Warsztaty i grupy wsparcia",
    description: "Kameralne spotkania w małych grupach, raz w miesiącu.",
    more: "Najbliższe tematy: uważność w codzienności, rodzicielstwo nastolatka, radzenie sobie ze stresem w pracy. Zapisy przez formularz kontaktowy.",
  },
  {
    id: "team",
    size: "small",
    tone: "cream",
    icon: <HandHeart />,
    stat: "12",
    title: "specjalistów pod stałą superwizją",
  },
] as const satisfies readonly BentoItem[];
