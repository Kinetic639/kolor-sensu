import { describe, expect, it } from "vitest";
import { serviceWeeks } from "./service-week";
import type { VisitLike } from "./visits";

const timeZone = "Europe/Warsaw";
// 2030-09-30 is a Monday; Thursday 3 October, 10:20 in Warsaw.
const at = (day: string, time: string) => `2030-${day}T${time}:00+02:00`;
const now = new Date(at("10-03", "10:20"));

const visit = (
  id: string,
  serviceId: string | undefined,
  day: string,
  from: string,
  to: string,
  more: Partial<VisitLike> = {},
): VisitLike =>
  ({
    id,
    reference: "3010-001",
    status: "confirmed",
    mode: "in_person",
    startsAt: new Date(at(day, from)).toISOString(),
    endsAt: new Date(at(day, to)).toISOString(),
    serviceId,
    serviceName: "Psychoterapia",
    specialist: { id: "anna", name: "Anna Nowak", color: "#c26a12" },
    room: { id: "green", name: "Gabinet Zielony", color: "#1e9e57" },
    locationName: null,
    client: { name: `Klient ${id}`, email: null, phone: null, notes: null },
    priceMinor: 22000,
    currencyCode: "PLN",
    payment: null,
    cancelledBy: null,
    rescheduleCount: 0,
    ...more,
  }) as VisitLike;

describe("serviceWeeks", () => {
  it("counts each service's visits day by day in the week, today marked", () => {
    const weeks = serviceWeeks({
      timeZone,
      now,
      week: "2030-09-30",
      visits: [
        visit("a", "therapy", "09-30", "09:00", "09:50"),
        visit("b", "therapy", "10-03", "11:00", "11:50"),
        visit("c", "therapy", "10-03", "14:00", "14:50"),
        visit("d", "couples", "10-02", "17:00", "18:20"),
        // Not in the week.
        visit("e", "therapy", "10-08", "09:00", "09:50"),
        // Cancelled, and one without a service: left out.
        visit("f", "therapy", "10-01", "09:00", "09:50", {
          status: "cancelled",
        }),
        visit("g", undefined, "10-01", "09:00", "09:50"),
      ],
    });
    const therapy = weeks.get("therapy")!;
    expect(therapy.days.map((day) => day.count)).toEqual([1, 0, 0, 2, 0, 0, 0]);
    expect(therapy.days[3]).toMatchObject({
      date: "2030-10-03",
      weekday: "Czw",
      isToday: true,
    });
    expect(therapy.visitCount).toBe(3);
    expect(weeks.get("couples")!.visitCount).toBe(1);
    expect(weeks.has("undefined")).toBe(false);
  });

  it("lists the next visits from now on, the soonest first, with who and where", () => {
    const weeks = serviceWeeks({
      timeZone,
      now,
      week: "2030-09-30",
      upcomingLimit: 2,
      visits: [
        visit("past", "therapy", "10-03", "08:00", "08:50"),
        visit("later", "therapy", "10-08", "09:00", "09:50", {
          mode: "online",
          room: null,
          status: "awaiting_payment",
        }),
        visit("soon", "therapy", "10-03", "11:00", "11:50"),
        visit("next", "therapy", "10-04", "09:00", "09:50"),
      ],
    });
    const upcoming = weeks.get("therapy")!.upcoming;
    expect(upcoming.map((one) => one.visitId)).toEqual(["soon", "next"]);
    expect(upcoming[0]).toMatchObject({
      date: "2030-10-03",
      dateLabel: "Czw 3.10",
      time: "11:00 – 11:50",
      startTime: "11:00",
      client: "Klient soon",
      specialist: { id: "anna", name: "Anna Nowak", color: "#c26a12" },
      place: { name: "Gabinet Zielony", color: "#1e9e57", online: false },
      pending: false,
    });
    // The week shown does not limit what comes next.
    const all = serviceWeeks({
      timeZone,
      now,
      week: "2030-09-30",
      visits: [
        visit("later", "therapy", "10-08", "09:00", "09:50", {
          mode: "online",
          room: null,
          status: "awaiting_payment",
        }),
      ],
    });
    expect(all.get("therapy")!.upcoming[0]).toMatchObject({
      dateLabel: "Wt 8.10",
      place: { name: "Online", online: true },
      pending: true,
    });
    expect(all.get("therapy")!.visitCount).toBe(0);
  });
});
