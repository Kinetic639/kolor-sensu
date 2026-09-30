import {
  dayView,
  personalWeek,
  weekComparison,
  type CalendarPerson,
  type CalendarRoom,
  type CalendarTimeOff,
  type CalendarWindow,
  type VisitLike,
} from "@repo/scheduling";

// A week of the centre for the calendar's stories and tests, after the
// reference's demo: six specialists, five rooms (one closed for works),
// online sessions; Wednesday 2 October 2030, now 12:37 in Warsaw.

export const timeZone = "Europe/Warsaw";
export const now = new Date("2030-10-02T10:37:00Z");
export const week = "2030-09-30";
export const today = "2030-10-02";

const person = (
  id: string,
  name: string,
  title: string | null,
  color: string | null = null,
): CalendarPerson => ({ id, name, title, avatarUrl: null, color });

export const people: CalendarPerson[] = [
  person("anna", "Anna Nowak", "Psychoterapeutka CBT", "#5f9e8f"),
  person("tomasz", "Tomasz Wójcik", "Psychoterapeuta systemowy"),
  person("katarzyna", "Katarzyna Wiśniewska", "Psychiatra"),
  person("michal", "Michał Zieliński", "Terapeuta par"),
  person("joanna", "Joanna Lis", "Terapeutka dzieci i młodzieży"),
  person("karolina", "Karolina Adamczyk", "Psycholożka"),
];

const weekdays = (weekday: number, startsAt: string, endsAt: string) => ({
  weekday,
  startsAt,
  endsAt,
});

export const rooms: CalendarRoom[] = [
  {
    id: "g1",
    name: "Gabinet 1",
    color: "#286e4d",
    locationId: "mokotowska",
    hours: [1, 2, 3, 4, 5].map((day) => weekdays(day, "08:00", "18:00")),
    exceptions: [],
  },
  {
    id: "g2",
    name: "Gabinet 2",
    color: "#cf5c2e",
    locationId: "mokotowska",
    hours: [1, 2, 3, 4, 5].map((day) => weekdays(day, "08:00", "18:00")),
    exceptions: [],
  },
  {
    id: "g3",
    name: "Gabinet 3",
    color: "#725aa6",
    locationId: "mokotowska",
    hours: [1, 2, 3, 4, 5].map((day) => weekdays(day, "08:00", "17:00")),
    exceptions: [
      {
        date: today,
        type: "blocked_interval",
        startsAt: "15:00",
        endsAt: "16:00",
        reason: "Sprzątanie",
      },
    ],
  },
  {
    id: "sala",
    name: "Sala warsztatowa",
    color: "#b37d28",
    locationId: "mokotowska",
    hours: [1, 2, 3, 4, 5].map((day) => weekdays(day, "09:00", "20:00")),
    exceptions: [],
  },
  {
    id: "g5",
    name: "Gabinet 5",
    color: null,
    locationId: "mokotowska",
    hours: [1, 2, 3, 4, 5].map((day) => weekdays(day, "08:00", "18:00")),
    exceptions: [0, 1, 2, 3, 4].map((offset) => ({
      date: `2030-${offset < 1 ? "09-30" : `10-0${offset}`}`,
      type: "closed_all_day" as const,
      startsAt: null,
      endsAt: null,
      reason: "Remont",
    })),
  },
];

/** A local date of the sample week (0 = Monday) at a time, as an instant. */
const at = (offset: number, time: string) => {
  const date = offset < 1 ? "2030-09-30" : `2030-10-0${offset}`;
  return new Date(`${date}T${time}:00+02:00`);
};

// Who works where and when, Monday to Friday.
const plan: [string, string, string, string][] = [
  ["anna", "g1", "08:00", "16:00"],
  ["anna", "online", "16:00", "18:00"],
  ["tomasz", "g2", "09:00", "15:00"],
  ["katarzyna", "g3", "08:00", "15:00"],
  ["michal", "sala", "10:00", "18:00"],
  ["joanna", "g1", "16:00", "17:30"],
  ["joanna", "online", "09:00", "13:00"],
];

export const windows: CalendarWindow[] = [0, 1, 2, 3, 4].flatMap((offset) =>
  plan
    // Michał works Tuesday to Thursday.
    .filter(([id]) => id !== "michal" || (offset >= 1 && offset <= 3))
    .map(([specialistId, placeId, from, to]) => ({
      id: `${specialistId}-${placeId}-${offset}`,
      specialistId,
      placeId,
      start: at(offset, from),
      end: at(offset, to),
    })),
);

export const timeOff: CalendarTimeOff[] = [
  {
    specialistId: "tomasz",
    start: at(2, "12:00"),
    end: at(2, "12:30"),
    reason: "Przerwa",
  },
];

const visit = (
  offset: number,
  specialistId: string,
  from: string,
  to: string,
  client: string,
  service: string,
  roomId: string | null,
  patch: Partial<VisitLike> = {},
): VisitLike => {
  const who = people.find((one) => one.id === specialistId)!;
  const room = rooms.find((one) => one.id === roomId) ?? null;
  return {
    id: "",
    reference: "",
    status: "confirmed",
    mode: roomId ? "in_person" : "online",
    startsAt: at(offset, from).toISOString(),
    endsAt: at(offset, to).toISOString(),
    serviceName: service,
    specialist: { id: who.id, name: who.name, color: who.color },
    room: room ? { id: room.id, name: room.name, color: room.color } : null,
    locationName: room ? "Mokotowska 46" : null,
    client: { name: client, email: null, phone: null, notes: null },
    priceMinor: 22000,
    currencyCode: "PLN",
    payment: null,
    cancelledBy: null,
    rescheduleCount: 0,
    ...patch,
  };
};

const visitsOn = (offset: number): VisitLike[] => [
  visit(
    offset,
    "anna",
    "08:00",
    "09:00",
    "Ewa Kowalska",
    "Konsultacja indywidualna",
    "g1",
  ),
  visit(
    offset,
    "anna",
    "10:30",
    "11:30",
    "Piotr Wiśniewski",
    "Psychoterapia CBT",
    "g1",
  ),
  visit(
    offset,
    "anna",
    "12:00",
    "13:00",
    "Katarzyna Zielińska",
    "Konsultacja psychologiczna",
    "g1",
  ),
  visit(
    offset,
    "anna",
    "13:00",
    "13:30",
    "Marta Nowicka",
    "Konsultacja krótka",
    "g1",
    {
      status: "awaiting_payment",
    },
  ),
  visit(
    offset,
    "anna",
    "16:30",
    "17:20",
    "Olga Mazur",
    "Konsultacja online",
    null,
  ),
  visit(
    offset,
    "tomasz",
    "09:00",
    "10:30",
    "Aleksandra Lewandowska",
    "Psychoterapia (1,5 godz.)",
    "g2",
  ),
  visit(
    offset,
    "tomasz",
    "11:00",
    "12:00",
    "Jan Kaczmarek",
    "Interwencja kryzysowa",
    "g2",
  ),
  visit(
    offset,
    "tomasz",
    "13:00",
    "14:30",
    "Robert Szymański",
    "Terapia rodzinna",
    "g2",
  ),
  visit(
    offset,
    "tomasz",
    "14:30",
    "15:30",
    "Anna Dąbrowska",
    "Psychoterapia",
    "g2",
  ),
  visit(
    offset,
    "katarzyna",
    "08:30",
    "09:30",
    "Adam Malinowski",
    "Konsultacja psychiatryczna",
    "g3",
  ),
  visit(
    offset,
    "katarzyna",
    "10:00",
    "11:00",
    "Zofia Marciniak",
    "Wizyta kontrolna",
    "g3",
  ),
  visit(
    offset,
    "katarzyna",
    "11:30",
    "12:30",
    "Tomasz Zieliński",
    "Konsultacja lekarska",
    "g3",
  ),
  ...(offset >= 1 && offset <= 3
    ? [
        visit(
          offset,
          "michal",
          "10:00",
          "11:30",
          "Paulina i Karol Kowalczyk",
          "Terapia par",
          "sala",
        ),
        visit(
          offset,
          "michal",
          "12:00",
          "13:30",
          "Nina i Kamil Kubiak",
          "Terapia par",
          "sala",
        ),
        visit(
          offset,
          "michal",
          "15:00",
          "16:00",
          "Grupa wsparcia",
          "Warsztat",
          "sala",
        ),
      ]
    : []),
  visit(
    offset,
    "joanna",
    "09:00",
    "09:50",
    "Oliwia Jankowska",
    "Konsultacja pedagogiczna (50 min)",
    null,
  ),
  visit(
    offset,
    "joanna",
    "10:30",
    "11:30",
    "Filip Kowalczyk",
    "Psychoterapia dziecięca",
    null,
  ),
  visit(
    offset,
    "joanna",
    "16:00",
    "17:00",
    "Igor Wróbel",
    "Terapia nastolatków",
    "g1",
  ),
  visit(
    offset,
    "joanna",
    "12:00",
    "12:50",
    "Hanna Pawlak",
    "Konsultacja",
    null,
    {
      status: "cancelled",
      cancelledBy: "client",
    },
  ),
];

// Ids by day and order: `d2-1` is Wednesday's first visit.
export const visits: VisitLike[] = [0, 1, 2, 3, 4].flatMap((offset) =>
  visitsOn(offset).map((one, index) => ({
    ...one,
    id: `d${offset}-${index + 1}`,
    reference: `30${offset}0-${String(index + 1).padStart(3, "0")}`,
  })),
);

const input = { timeZone, now, people, rooms, windows, timeOff, visits };

export const specialistsDay = dayView({
  ...input,
  date: today,
  perspective: "specialists",
});

export const roomsDay = dayView({
  ...input,
  date: today,
  perspective: "rooms",
});

export const specialistsWeek = weekComparison({
  ...input,
  week,
  perspective: "specialists",
});

export const roomsWeek = weekComparison({
  ...input,
  week,
  perspective: "rooms",
});

export const annaWeek = personalWeek({ ...input, week, person: people[0]! });
