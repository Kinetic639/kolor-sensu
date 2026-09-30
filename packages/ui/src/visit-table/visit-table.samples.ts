import { visitEventRows, visitRows } from "@repo/scheduling";
import { sampleVisits } from "../visit-list.samples";
import { loadVisitTableParams } from "./params";

// Sample rows and addresses for the bookings table's stories and tests.

const options = {
  timeZone: "Europe/Warsaw",
  now: new Date("2030-10-01T08:00:00Z"),
};

export const adminRows = visitRows(sampleVisits, options);

export const specialistRows = visitRows(
  sampleVisits
    .filter((visit) => visit.specialist.id === "anna")
    .map((visit) => ({ ...visit, payment: null })),
  options,
);

export const tableParams = (query = "") =>
  loadVisitTableParams(new URLSearchParams(query));

export const sampleSpecialists = [
  { id: "0b8f1f6e-2c1d-4c3a-9a55-3f1d2e4b5c6d", name: "Anna Kłobuchowska" },
  { id: "5c2e7a10-9f3b-4d1e-8a6c-2b7d9e0f1a3c", name: "Michał Stępień" },
];

export const sampleServices = [
  {
    id: "7d1c2b3a-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
    name: "Konsultacja psychologiczna",
  },
  {
    id: "8e2d3c4b-5f6a-4b7c-9d8e-0f1a2b3c4d5e",
    name: "Psychoterapia indywidualna",
  },
];

export const sampleRooms = [
  { id: "9f3e4d5c-6a7b-4c8d-8e9f-1a2b3c4d5e6f", name: "Gabinet Zielony" },
];

/** A visit's history as the side panel shows it. */
export const sampleEvents = visitEventRows(
  [
    {
      id: 1,
      occurredAt: "2030-09-20T10:00:00Z",
      kind: "created",
      actor: "client",
      actorName: null,
      details: {
        starts_at: "2030-10-02T07:00:00Z",
        ends_at: "2030-10-02T07:50:00Z",
      },
    },
    {
      id: 2,
      occurredAt: "2030-09-20T10:04:00Z",
      kind: "payment_succeeded",
      actor: "payment",
      actorName: null,
      details: { amount_minor: 20000 },
    },
    {
      id: 3,
      occurredAt: "2030-09-20T10:05:00Z",
      kind: "confirmed",
      actor: "payment",
      actorName: null,
      details: {},
    },
    {
      id: 4,
      occurredAt: "2030-09-20T10:06:00Z",
      kind: "email_sent",
      actor: "system",
      actorName: null,
      details: { email: "confirmation" },
    },
  ],
  { timeZone: "Europe/Warsaw", currencyCode: "PLN" },
);

export const panelTabs = [
  { key: "szczegoly" as const, label: "Szczegóły", href: "?karta=szczegoly" },
  { key: "historia" as const, label: "Historia", href: "?karta=historia" },
];
