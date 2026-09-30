import {
  dayView,
  weekView,
  type CalendarResource,
  type CalendarWindow,
  type VisitLike,
} from "@repo/scheduling";

// Sample days and weeks for the calendar views' stories and tests: two
// specialists in two rooms and online, on Wednesday 2 October 2030, with
// "now" at noon in Warsaw.

export const timeZone = "Europe/Warsaw";
export const now = new Date("2030-10-02T10:00:00Z");

export const anna: CalendarResource = {
  id: "anna",
  name: "Anna Kłobuchowska",
  color: "#5f9e8f",
};
export const michal: CalendarResource = {
  id: "michal",
  name: "Michał Stępień",
  color: null,
};
export const ewa: CalendarResource = {
  id: "ewa",
  name: "Ewa Lis",
  color: null,
};
export const green: CalendarResource = {
  id: "green",
  name: "Gabinet Zielony",
  color: "#7fb3a6",
};
export const blue: CalendarResource = {
  id: "blue",
  name: "Gabinet Niebieski",
  color: "#6b8fc7",
};

const at = (day: number, time: string) =>
  new Date(`2030-10-0${day}T${time}:00+02:00`);

export const sampleWindows: CalendarWindow[] = [
  ...[1, 2, 3].map((day) => ({
    id: `anna-${day}`,
    specialist: anna,
    room: green,
    start: at(day, "09:00"),
    end: at(day, "15:00"),
    mode: "in_person" as const,
  })),
  ...[2, 4].map((day) => ({
    id: `michal-${day}`,
    specialist: michal,
    room: blue,
    start: at(day, "10:00"),
    end: at(day, "14:00"),
    mode: "in_person" as const,
  })),
  {
    id: "michal-online",
    specialist: michal,
    room: null,
    start: at(2, "16:00"),
    end: at(2, "19:00"),
    mode: "online",
  },
];

const base: VisitLike = {
  id: "v1",
  reference: "3010-001",
  status: "confirmed",
  mode: "in_person",
  startsAt: at(2, "09:00").toISOString(),
  endsAt: at(2, "09:50").toISOString(),
  serviceName: "Konsultacja psychologiczna",
  specialist: anna,
  room: green,
  locationName: "Siedziba Główna",
  client: { name: "Jan Kowalski", email: null, phone: null, notes: null },
  priceMinor: 20000,
  currencyCode: "PLN",
  payment: null,
  cancelledBy: null,
  rescheduleCount: 0,
};

export const sampleVisits: VisitLike[] = [
  base,
  {
    ...base,
    id: "v2",
    reference: "3010-002",
    startsAt: at(2, "11:00").toISOString(),
    endsAt: at(2, "12:30").toISOString(),
    serviceName: "Terapia par",
    client: { ...base.client, name: "Maria i Piotr Nowak" },
  },
  {
    ...base,
    id: "v3",
    reference: "3010-003",
    status: "awaiting_payment",
    startsAt: at(2, "12:00").toISOString(),
    endsAt: at(2, "12:30").toISOString(),
    serviceName: "Konsultacja krótka",
    client: { ...base.client, name: "Ola Wiśniewska" },
  },
  {
    ...base,
    id: "v4",
    reference: "3010-004",
    specialist: michal,
    room: blue,
    startsAt: at(2, "10:00").toISOString(),
    endsAt: at(2, "10:50").toISOString(),
    serviceName: "Psychoterapia indywidualna",
    client: { ...base.client, name: "Tomasz Zieliński" },
  },
  {
    ...base,
    id: "v5",
    reference: "3010-005",
    mode: "online",
    room: null,
    specialist: michal,
    startsAt: at(2, "17:00").toISOString(),
    endsAt: at(2, "17:50").toISOString(),
    serviceName: "Konsultacja online",
    client: { ...base.client, name: "Karolina Adamczyk" },
  },
  {
    ...base,
    id: "v6",
    reference: "3010-006",
    startsAt: at(3, "10:00").toISOString(),
    endsAt: at(3, "10:50").toISOString(),
    client: { ...base.client, name: "Paweł Mazur" },
  },
];

export const specialistsDay = dayView({
  date: "2030-10-02",
  timeZone,
  perspective: "specialists",
  resources: [anna, michal, ewa],
  windows: sampleWindows,
  visits: sampleVisits,
  now,
});

export const roomsDay = dayView({
  date: "2030-10-02",
  timeZone,
  perspective: "rooms",
  resources: [green, blue],
  windows: sampleWindows,
  visits: sampleVisits,
  now,
});

export const annaWeek = weekView({
  week: "2030-09-30",
  timeZone,
  resource: { kind: "specialist", id: "anna" },
  windows: sampleWindows,
  visits: sampleVisits,
  now,
});
