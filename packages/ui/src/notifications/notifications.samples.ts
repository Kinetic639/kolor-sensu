import {
  notificationView,
  type NotificationLike,
  type NotificationView,
} from "@repo/scheduling";

// An example morning (Saturday 3 October 2026, 12:30) for the panel's
// tests and stories, made by the same view as the portals'.

const now = new Date("2026-10-03T10:30:00Z");

const base: NotificationLike = {
  id: 0,
  kind: "booked",
  actor: "payment",
  appointmentId: "visit-0",
  createdAt: "2026-10-03T10:17:00Z",
  readAt: null,
  details: {
    reference: "2610-027",
    startsAt: "2026-10-09T08:00:00Z",
    mode: "in_person",
    clientName: "Michał Stępień",
    serviceName: "Psychoterapia indywidualna",
    specialistName: "Anna Kłobuchowska",
    fromStartsAt: null,
    reason: null,
    refundMinor: null,
    refundDueMinor: null,
    priceMinor: 24000,
    currencyCode: "PLN",
  },
};

const raw: [Partial<NotificationLike>, Partial<NotificationLike["details"]>][] =
  [
    [{ id: 1, kind: "reserved", actor: "client" }, { mode: "online" }],
    [
      { id: 2, kind: "paid", createdAt: "2026-10-03T09:02:00Z" },
      {
        reference: "2610-025",
        clientName: "Ewa Nowak",
        serviceName: "Konsultacja psychologiczna",
        startsAt: "2026-10-15T12:00:00Z",
      },
    ],
    [
      {
        id: 3,
        kind: "rescheduled",
        actor: "client",
        createdAt: "2026-10-03T07:40:00Z",
      },
      {
        reference: "2610-019",
        clientName: "Jan Kowalski",
        startsAt: "2026-10-12T07:00:00Z",
        fromStartsAt: "2026-10-07T06:00:00Z",
        mode: "online",
      },
    ],
    [
      {
        id: 4,
        kind: "cancelled",
        actor: "client",
        createdAt: "2026-10-02T19:30:00Z",
        readAt: "2026-10-02T20:00:00Z",
      },
      {
        reference: "2610-024",
        clientName: "Marta Wiśniewska",
        startsAt: "2026-10-15T11:00:00Z",
        refundDueMinor: 24000,
      },
    ],
    [
      {
        id: 5,
        kind: "booked",
        createdAt: "2026-10-02T09:42:00Z",
        readAt: "2026-10-02T10:00:00Z",
      },
      {
        reference: "2610-023",
        clientName: "Piotr Zieliński",
        serviceName: "Konsultacja psychologiczna",
        specialistName: "Michał Stępień",
        startsAt: "2026-10-13T09:00:00Z",
      },
    ],
    [
      {
        id: 6,
        kind: "cancelled",
        actor: "system",
        createdAt: "2026-09-30T16:02:00Z",
        readAt: "2026-09-30T17:00:00Z",
      },
      {
        reference: "2610-015",
        clientName: "Tomasz Dąbrowski",
        startsAt: "2026-10-08T13:00:00Z",
        reason: "unpaid",
      },
    ],
    [
      {
        id: 7,
        kind: "refunded",
        actor: "centre",
        createdAt: "2026-09-29T08:15:00Z",
        readAt: "2026-09-29T09:00:00Z",
      },
      {
        reference: "2610-018",
        clientName: "Katarzyna Lewandowska",
        serviceName: "Terapia dla par",
        startsAt: "2026-10-02T14:00:00Z",
        refundMinor: 24000,
      },
    ],
  ];

export const sampleNotifications: NotificationView[] = raw.map(([o, d]) =>
  notificationView(
    {
      ...base,
      appointmentId: `visit-${o.id}`,
      ...o,
      details: { ...base.details, ...d },
    },
    { timeZone: "Europe/Warsaw", portal: "admin", now },
  ),
);

export const sampleUnreadCount = sampleNotifications.filter(
  (item) => item.unread,
).length;
