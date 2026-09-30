import { visitDays, type VisitLike } from "@repo/scheduling";

// Sample visits for the stories and tests of the visit list.

const base: VisitLike = {
  id: "v1",
  reference: "KS-20301002-1534",
  status: "confirmed",
  mode: "in_person",
  startsAt: "2030-10-02T07:00:00Z",
  endsAt: "2030-10-02T07:50:00Z",
  serviceName: "Konsultacja psychologiczna",
  specialist: { id: "anna", name: "Anna Kłobuchowska", color: "#5f9e8f" },
  room: { id: "r1", name: "Gabinet Zielony", color: null },
  locationName: "Siedziba Główna",
  client: {
    name: "Jan Kowalski",
    email: "jan.kowalski@example.com",
    phone: "600 100 200",
    notes: "Wolę spotkania rano.",
  },
  priceMinor: 20000,
  currencyCode: "PLN",
  payment: { paid: true, refundDueMinor: null, refundedMinor: 0 },
  cancelledBy: null,
  rescheduleCount: 0,
};

export const sampleVisits: VisitLike[] = [
  base,
  {
    ...base,
    id: "v2",
    reference: "KS-20301002-2211",
    mode: "online",
    room: null,
    startsAt: "2030-10-02T09:00:00Z",
    endsAt: "2030-10-02T09:50:00Z",
    specialist: { id: "michal", name: "Michał Stępień", color: null },
    client: {
      name: "Ewa Nowak",
      email: "ewa@example.com",
      phone: null,
      notes: null,
    },
    rescheduleCount: 1,
  },
  {
    ...base,
    id: "v3",
    reference: "KS-20301003-0412",
    startsAt: "2030-10-03T12:00:00Z",
    endsAt: "2030-10-03T12:50:00Z",
    status: "cancelled",
    cancelledBy: "client",
    payment: { paid: true, refundDueMinor: 20000, refundedMinor: 0 },
    client: { ...base.client, name: "Ola Wiśniewska" },
  },
  {
    ...base,
    id: "v4",
    reference: "KS-20301003-7730",
    startsAt: "2030-10-03T14:00:00Z",
    endsAt: "2030-10-03T14:50:00Z",
    status: "awaiting_payment",
    payment: { paid: false, refundDueMinor: null, refundedMinor: 0 },
    client: { ...base.client, name: "Piotr Zieliński", notes: null },
  },
];

const options = {
  timeZone: "Europe/Warsaw",
  now: new Date("2030-10-01T08:00:00Z"),
};

/** The admin's view: everyone's visits, with the money. */
export const adminVisitDays = visitDays(sampleVisits, options);

/** A specialist's view: their visits, no payments. */
export const specialistVisitDays = visitDays(
  sampleVisits
    .filter((visit) => visit.specialist.id === "anna")
    .map((visit) => ({ ...visit, payment: null })),
  options,
);
