import type {
  CalendarPlace,
  NowStatus,
  Occupancy,
  UpcomingVisit,
  WeekDay,
} from "@repo/scheduling";
import type {
  SpecialistOffer,
  SpecialistProfileState,
  SpecialistRow,
} from "./types";

// The team in the stories and tests: specialists at work, one waiting for
// review; the week of 5–11 October 2030, Thursday the 8th today.

export const BLUE_ROOM: CalendarPlace = {
  id: "55555555-5555-4555-8555-555555555555",
  name: "Gabinet Niebieski",
  short: "GN",
  color: "#2563d9",
  online: false,
};

export const GREEN_ROOM: CalendarPlace = {
  id: "44444444-4444-4444-8444-444444444444",
  name: "Gabinet Zielony",
  short: "GZ",
  color: "#1e9e57",
  online: false,
};

export const ONLINE_PLACE: CalendarPlace = {
  id: "online",
  name: "Online",
  short: "ONL",
  color: null,
  online: true,
};

const tenth = (minutes: number) => Math.round((minutes / 60) * 10) / 10;

export function occupancy(percent: number, availableHours = 15): Occupancy {
  const availableMinutes = availableHours * 60;
  const bookedMinutes = Math.round((availableMinutes * percent) / 100);
  return {
    visitCount: Math.round(bookedMinutes / 50),
    bookedMinutes,
    availableMinutes,
    bookedHours: tenth(bookedMinutes),
    availableHours,
    freeHours: Math.max(0, tenth(availableMinutes - bookedMinutes)),
    percent,
    overbooked: percent > 100,
    overMinutes: Math.max(0, bookedMinutes - availableMinutes),
  };
}

const WEEKDAYS = ["Pn", "Wt", "Śr", "Czw", "Pt", "Sob", "Nd"];

/** Monday to Friday on duty (the given places), the weekend off. */
export function weekOf(
  percent: number,
  places: CalendarPlace[] = [GREEN_ROOM, ONLINE_PLACE],
): WeekDay[] {
  return WEEKDAYS.map((weekday, index) => {
    const on = percent > 0 && index < 5;
    const place = places[index % places.length]!;
    return {
      date: `2030-10-${String(5 + index).padStart(2, "0")}`,
      weekday,
      dateLabel: `${5 + index}.10`,
      isToday: index === 3,
      shifts: on ? [{ time: "09:00–12:00", place }] : [],
      availableHours: on ? 3 : 0,
      bookedHours: on ? tenth((180 * percent) / 100) : 0,
      percent: on ? percent : 0,
      overbooked: on && percent > 100,
    };
  });
}

export function upcoming(
  date: string,
  startTime: string,
  client = "Jan Kowalski",
  pending = false,
): UpcomingVisit {
  const [day, month] = [Number(date.slice(8)), Number(date.slice(5, 7))];
  return {
    visitId: `visit-${date}-${startTime}`,
    date,
    dateLabel: `${WEEKDAYS[(new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7]} ${day}.${month}`,
    time: `${startTime} – ${startTime.slice(0, 2)}:50`,
    startTime,
    client,
    service: "Konsultacja psychologiczna",
    place: GREEN_ROOM,
    pending,
  };
}

export function specialistRow({
  id,
  name,
  title = null,
  services = 4,
  state = {},
  percent = 50,
  next = null,
  now = null,
  color = null,
}: {
  id: string;
  name: string;
  title?: string | null;
  services?: number;
  state?: Partial<{
    active: boolean;
    accepting: boolean;
    profile: SpecialistProfileState;
  }>;
  percent?: number;
  /** The next visit: its day and time. */
  next?: [string, string] | null;
  now?: NowStatus | null;
  color?: string | null;
}): SpecialistRow {
  const words = name.split(" ");
  return {
    id,
    name,
    title,
    initials: `${words[0]![0]}${words.at(-1)![0]}`,
    avatarUrl: null,
    color,
    href: `/specjalisci/${id}`,
    services,
    since: "od 03.2026",
    slug: name.toLowerCase().replace(/\s+/g, "-"),
    state: {
      active: state.active ?? true,
      acceptingNewClients: state.accepting ?? true,
      profile: state.profile ?? "published",
    },
    days: weekOf(percent),
    occupancy: occupancy(percent, percent ? 15 : 0),
    now,
    upcoming: next ? [upcoming(next[0], next[1])] : [],
  };
}

export const SAMPLE_SPECIALISTS: SpecialistRow[] = [
  {
    ...specialistRow({
      id: "11111111-1111-4111-8111-111111111111",
      name: "Anna Kłobuchowska",
      title: "Psycholog / Psychoterapeuta",
      state: { accepting: false },
      percent: 78,
      color: "#c26a12",
      now: {
        tone: "busy",
        title: "Wizyta online do 10:50",
        detail: "Katarzyna Lewandowska · potem 13:00",
      },
    }),
    upcoming: [
      upcoming("2030-10-08", "13:00", "Piotr Zieliński"),
      upcoming("2030-10-08", "14:00", "Agnieszka Kamińska", true),
      upcoming("2030-10-08", "16:00", "Tomasz Lewicki"),
    ],
  },
  specialistRow({
    id: "22222222-2222-4222-8222-222222222222",
    name: "Michał Stępień",
    title: "Psychoterapeuta / Psycholog",
    percent: 104,
    next: ["2030-10-08", "12:00"],
    color: "#6b45c9",
    now: {
      tone: "free",
      title: "Dyżur · Gabinet Niebieski · wolny",
      detail: "Następna 12:00 · Marta Wiśniewska",
    },
  }),
  specialistRow({
    id: "33333333-3333-4333-8333-333333333333",
    name: "Ewa Wójcik",
    title: "Psycholożka",
    services: 0,
    state: { profile: "pending", active: false },
    percent: 0,
    now: { tone: "off", title: "Nieaktywny", detail: null },
  }),
];

export const SAMPLE_OFFERS: SpecialistOffer[] = [
  {
    id: "offer-1",
    serviceName: "Konsultacja psychologiczna",
    category: "Inne",
    price: "240 zł",
    duration: "50 min",
    inPerson: true,
    online: true,
    active: true,
    acceptingNewClients: true,
  },
  {
    id: "offer-2",
    serviceName: "Terapia dla par",
    category: "Terapia par",
    price: "280 zł",
    duration: "50 min",
    inPerson: true,
    online: false,
    active: true,
    acceptingNewClients: false,
  },
  {
    id: "offer-3",
    serviceName: "Wsparcie dla dzieci i młodzieży",
    category: "Psychoterapia",
    price: "195 zł",
    duration: "50 min",
    inPerson: true,
    online: true,
    active: false,
    acceptingNewClients: true,
  },
];
