import type { ServiceDay, ServiceVisit } from "@repo/scheduling";
import type { ServiceOffer, ServiceRow } from "./types";

// The centre's offer for the stories and tests: the services as the
// centre has them (two in the catalogue "Terapie"), one inactive with
// nobody leading it. The week of 5–11
// October 2030; today is Thursday the 8th.

const WEEKDAYS = ["Pn", "Wt", "Śr", "Czw", "Pt", "Sob", "Nd"];

const days = (counts: number[]): ServiceDay[] =>
  counts.map((count, index) => ({
    date: `2030-10-${String(5 + index).padStart(2, "0")}`,
    weekday: WEEKDAYS[index]!,
    isToday: index === 3,
    count,
  }));

const PEOPLE = {
  ms: {
    id: "7f6ecfde-0000-4000-8000-000000000001",
    name: "Michał Stępień",
    title: "Psychoterapeuta / Psycholog",
    initials: "MS",
    avatarUrl: null,
    color: "#6b45c9",
    href: "/specjalisci/7f6ecfde-0000-4000-8000-000000000001",
  },
  ak: {
    id: "7f6ecfde-0000-4000-8000-000000000002",
    name: "Anna Kłobuchowska",
    title: "Psycholog",
    initials: "AK",
    avatarUrl: null,
    color: "#c26a12",
    href: "/specjalisci/7f6ecfde-0000-4000-8000-000000000002",
  },
  ew: {
    id: "7f6ecfde-0000-4000-8000-000000000003",
    name: "Ewa Wójcik",
    title: "Psychoterapeutka dzieci i młodzieży",
    initials: "EW",
    avatarUrl: null,
    color: "#0891b2",
    href: "/specjalisci/7f6ecfde-0000-4000-8000-000000000003",
  },
};

let offerId = 0;
const offer = (
  who: keyof typeof PEOPLE,
  zl: number,
  more: Partial<Omit<ServiceOffer, "specialist">> = {},
): ServiceOffer => ({
  id: `offer-${++offerId}`,
  specialist: PEOPLE[who],
  price: `${zl} zł`,
  priceMinor: zl * 100,
  durationMinutes: 50,
  inPerson: true,
  online: true,
  active: true,
  ...more,
});

const visit = (
  id: string,
  dateLabel: string,
  date: string,
  startTime: string,
  client: string,
  who: keyof typeof PEOPLE,
  room: string | null,
  pending = false,
): ServiceVisit => {
  const [h, m] = startTime.split(":").map(Number) as [number, number];
  const end = h * 60 + m + 50;
  const endTime = `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
  return {
    visitId: id,
    date,
    dateLabel,
    time: `${startTime} – ${endTime}`,
    startTime,
    client,
    specialist: {
      id: PEOPLE[who].id,
      name: PEOPLE[who].name,
      color: PEOPLE[who].color,
    },
    place: room
      ? {
          id: room,
          name: room,
          short: room,
          color: room.includes("Zielony") ? "#1e9e57" : "#2563d9",
          online: false,
        }
      : {
          id: "online",
          name: "Online",
          short: "ONL",
          color: null,
          online: true,
        },
    pending,
  };
};

const base = {
  active: true,
  publiclyVisible: true,
  bookingEnabled: true,
  requiresIntake: false,
  forMinors: false,
  durationMinutes: 50,
  afterMinutes: 10,
};

export const SAMPLE_SERVICES: ServiceRow[] = [
  {
    ...base,
    id: "5e0c1a2b-0000-4000-8000-000000000001",
    name: "Konsultacja psychologiczna",
    slug: "konsultacja-psychologiczna",
    category: "other",
    categoryLabel: "Inne",
    href: "/oferta/5e0c1a2b-0000-4000-8000-000000000001",
    publicUrl: "http://localhost:3000/oferta/konsultacja-psychologiczna",
    shortDescription: "Pierwszy krok do zmiany.",
    sortOrder: 1,
    position: 1,
    catalog: null,
    order: 1,
    paint: "sage-1",
    offers: [offer("ms", 200), offer("ak", 220, { online: false })],
    days: days([1, 0, 1, 1, 0, 0, 0]),
    visitCount: 3,
    upcoming: [
      visit(
        "v1",
        "Czw 8.10",
        "2030-10-08",
        "12:00",
        "Jan Kowalski",
        "ak",
        "Gabinet Zielony",
      ),
      visit(
        "v2",
        "Pt 9.10",
        "2030-10-09",
        "09:00",
        "Ola Nowak",
        "ms",
        null,
        true,
      ),
    ],
  },
  {
    ...base,
    id: "5e0c1a2b-0000-4000-8000-000000000002",
    name: "Psychoterapia indywidualna",
    slug: "psychoterapia-indywidualna",
    category: "psychotherapy",
    categoryLabel: "Psychoterapia",
    href: "/oferta/5e0c1a2b-0000-4000-8000-000000000002",
    publicUrl: "http://localhost:3000/oferta/psychoterapia-indywidualna",
    shortDescription: "Przestrzeń na Ciebie i Twoje potrzeby.",
    sortOrder: 2,
    position: 2,
    catalog: { id: "7a1c0000-0000-4000-8000-000000000001", name: "Terapie" },
    order: 2,
    paint: "pink-1",
    offers: [
      offer("ms", 220),
      offer("ak", 240, { durationMinutes: 60, online: false }),
    ],
    days: days([2, 1, 2, 3, 1, 0, 0]),
    visitCount: 9,
    upcoming: [
      visit(
        "v3",
        "Czw 8.10",
        "2030-10-08",
        "11:00",
        "Jan Kowalski",
        "ms",
        "Gabinet Niebieski",
      ),
      visit(
        "v4",
        "Czw 8.10",
        "2030-10-08",
        "14:00",
        "Marta Lis",
        "ak",
        "Gabinet Niebieski",
      ),
      visit("v5", "Pt 9.10", "2030-10-09", "10:00", "Piotr Zając", "ms", null),
    ],
  },
  {
    ...base,
    id: "5e0c1a2b-0000-4000-8000-000000000003",
    name: "Terapia dla par",
    slug: "terapia-dla-par",
    category: "couples_therapy",
    categoryLabel: "Terapia par",
    href: "/oferta/5e0c1a2b-0000-4000-8000-000000000003",
    publicUrl: "http://localhost:3000/oferta/terapia-dla-par",
    shortDescription: "Lepsza komunikacja, większa bliskość.",
    durationMinutes: 80,
    sortOrder: 3,
    position: 3,
    catalog: { id: "7a1c0000-0000-4000-8000-000000000001", name: "Terapie" },
    order: 3,
    paint: "sage-2",
    offers: [
      offer("ms", 260, { durationMinutes: 80, online: false }),
      offer("ak", 280, {
        durationMinutes: 90,
        online: false,
      }),
    ],
    days: days([0, 1, 0, 1, 0, 0, 0]),
    visitCount: 2,
    upcoming: [
      visit(
        "v6",
        "Czw 8.10",
        "2030-10-08",
        "17:00",
        "Anna i Tomasz B.",
        "ms",
        "Gabinet Zielony",
      ),
    ],
  },
  {
    ...base,
    id: "5e0c1a2b-0000-4000-8000-000000000004",
    name: "Wsparcie dla dzieci i młodzieży",
    slug: "wsparcie-dla-dzieci-i-mlodziezy",
    category: "psychotherapy",
    categoryLabel: "Psychoterapia",
    href: "/oferta/5e0c1a2b-0000-4000-8000-000000000004",
    publicUrl: "http://localhost:3000/oferta/wsparcie-dla-dzieci-i-mlodziezy",
    shortDescription: "Zrozumienie, rozwój i bezpieczeństwo.",
    sortOrder: 4,
    position: 4,
    catalog: null,
    order: 4,
    paint: "pink-2",
    offers: [
      offer("ms", 180),
      offer("ew", 190, {
        active: false,
        online: false,
      }),
    ],
    days: days([0, 0, 1, 0, 0, 0, 0]),
    visitCount: 1,
    upcoming: [],
  },
  {
    ...base,
    id: "5e0c1a2b-0000-4000-8000-000000000005",
    name: "Diagnoza psychologiczna",
    slug: "diagnoza-psychologiczna",
    category: "assessment",
    categoryLabel: "Diagnoza",
    href: "/oferta/5e0c1a2b-0000-4000-8000-000000000005",
    publicUrl: "http://localhost:3000/oferta/diagnoza-psychologiczna",
    shortDescription: null,
    durationMinutes: 90,
    active: false,
    bookingEnabled: false,
    sortOrder: 5,
    position: null,
    catalog: null,
    order: 5,
    paint: "sage-1",
    offers: [],
    days: days([0, 0, 0, 0, 0, 0, 0]),
    visitCount: 0,
    upcoming: [],
  },
];
