import { visitRows } from "@repo/scheduling";
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
