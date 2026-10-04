import type { RoomDay, RoomToday } from "@repo/scheduling";
import type { RoomRow } from "./types";

// The rooms in the stories and tests: two in use, one hardly; the week of
// 5–11 October 2030, Thursday the 8th today, 10:20.

const WEEKDAYS = ["Pn", "Wt", "Śr", "Czw", "Pt", "Sob", "Nd"];

const anna = { id: "anna", name: "Anna Kłobuchowska", color: "#c26a12" };
const michal = { id: "michal", name: "Michał Stępień", color: "#6b45c9" };
const ewa = { id: "ewa", name: "Ewa Wójcik", color: "#0891b2" };

function days(percents: (number | null)[], closedOn?: number): RoomDay[] {
  return WEEKDAYS.map((weekday, index) => {
    const percent = percents[index] ?? null;
    return {
      date: `2030-10-${String(5 + index).padStart(2, "0")}`,
      weekday,
      dateLabel: `${5 + index}.10`,
      isToday: index === 3,
      hours: percent === null || index === closedOn ? null : "08:00 – 20:00",
      closed: index === closedOn ? "Malowanie" : null,
      availableHours: percent === null ? 0 : 12,
      bookedHours: percent === null ? 0 : Math.round(percent * 1.2) / 10,
      percent: percent ?? 0,
      overbooked: false,
    };
  });
}

const block = (
  key: string,
  person: typeof anna,
  start: string,
  end: string,
) => {
  const minutes = (time: string) =>
    Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  return {
    key,
    person,
    start: minutes(start),
    end: minutes(end),
    time: `${start}–${end}`,
  };
};

const today = (patch: Partial<RoomToday> = {}): RoomToday => ({
  date: "2030-10-08",
  range: { start: 480, end: 1200 },
  now: 620,
  closed: null,
  duties: [
    block("d1", michal, "08:00", "12:00"),
    block("d2", anna, "13:00", "18:00"),
  ],
  visits: [
    {
      ...block("v1", michal, "09:00", "09:50"),
      visitId: "v1",
      client: "Jan Kowalski",
    },
    {
      ...block("v2", anna, "13:00", "13:50"),
      visitId: "v2",
      client: "Piotr Zieliński",
    },
    {
      ...block("v3", anna, "14:00", "14:50"),
      visitId: "v3",
      client: "Ewa Nowak",
    },
  ],
  ...patch,
});

const occupancy = (percent: number) => ({
  visitCount: Math.round(percent / 10),
  bookedMinutes: percent * 36,
  availableMinutes: 3600,
  bookedHours: Math.round(percent * 0.6) / 10,
  availableHours: 60,
  freeHours: Math.round((60 - percent * 0.6) * 10) / 10,
  percent,
  overbooked: false,
  overMinutes: 0,
});

const HOURS = WEEKDAYS.map((weekday, index) => ({
  weekday,
  hours: index < 5 ? "08:00–20:00" : null,
}));

export function roomRow(
  patch: Partial<RoomRow> & Pick<RoomRow, "id" | "name">,
): RoomRow {
  return {
    color: null,
    href: `/gabinety/${patch.id}`,
    location: "Siedziba Główna",
    capacity: 1,
    sortOrder: 1,
    active: true,
    onSite: true,
    hoursSummary: "Pn–Pt 08:00–20:00",
    openingHours: HOURS,
    exceptions: [],
    days: days([60, 70, 0, 80, 40, null, null]),
    occupancy: occupancy(50),
    today: today(),
    now: {
      tone: "free",
      title: "Dyżur: Michał Stępień · wolny",
      detail: "Bez wizyt do 12:00",
    },
    users: [
      { person: michal, days: "Pn, Czw", hours: 9.5 },
      { person: anna, days: "Czw", hours: 5 },
    ],
    ...patch,
  };
}

export const SAMPLE_ROOMS: RoomRow[] = [
  roomRow({
    id: "55555555-5555-4555-8555-555555555555",
    name: "Gabinet Niebieski",
    color: "#2563d9",
    sortOrder: 1,
    occupancy: occupancy(69),
    exceptions: [
      { key: "e1", date: "12.10", text: "Zablokowany 16:00–20:00 · malowanie" },
      {
        key: "e2",
        date: "1.11",
        text: "Zamknięty cały dzień · Wszystkich Świętych",
      },
    ],
  }),
  roomRow({
    id: "44444444-4444-4444-8444-444444444444",
    name: "Gabinet Zielony",
    color: "#1e9e57",
    sortOrder: 2,
    occupancy: occupancy(38),
    days: days([50, 0, 20, 40, 60, 0, null], 2),
    today: today({
      duties: [block("d3", ewa, "15:00", "19:00")],
      visits: [
        {
          ...block("v4", ewa, "15:00", "15:50"),
          visitId: "v4",
          client: "Ola Dąbrowska",
        },
      ],
    }),
    now: { tone: "later", title: "Wolny do 15:00", detail: "15:00 Ewa Wójcik" },
    users: [{ person: ewa, days: "Czw", hours: 4 }],
  }),
  roomRow({
    id: "66666666-6666-4666-8666-666666666666",
    name: "Sala warsztatowa",
    color: "#c026d3",
    capacity: 12,
    sortOrder: 3,
    active: false,
    onSite: false,
    hoursSummary: null,
    openingHours: WEEKDAYS.map((weekday) => ({ weekday, hours: null })),
    occupancy: occupancy(0),
    days: days([null, null, null, null, null, null, null]),
    today: today({ duties: [], visits: [] }),
    now: { tone: "off", title: "Dziś bez dyżurów", detail: null },
    users: [],
  }),
];
