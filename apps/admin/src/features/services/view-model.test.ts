import { describe, expect, it } from "vitest";
import type { ServiceListItemViewModel } from "./types";
import { toServiceListItems } from "./view-model";

const service: ServiceListItemViewModel = {
  id: "service-1",
  name: "Konsultacja psychologiczna",
  slug: "konsultacja-psychologiczna",
  category: "consultation",
  categoryLabel: "Konsultacja",
  durationLabel: "50 min",
  active: true,
  publiclyVisible: true,
  bookingEnabled: true,
  specialistOfferCount: 3,
  sortOrder: 0,
};

describe("toServiceListItems", () => {
  it("lists a service with its category, length, specialists and statuses", () => {
    expect(toServiceListItems([service])[0]).toEqual({
      id: "service-1",
      href: "/oferta/service-1",
      name: "Konsultacja psychologiczna",
      description: "Konsultacja",
      facts: ["50 min", "Specjaliści: 3"],
      statuses: [
        { label: "Aktywna", tone: "success" },
        { label: "Na stronie", tone: "info" },
        { label: "Rezerwacja online", tone: "info" },
      ],
      tags: ["active", "on-site", "booking"],
      muted: false,
    });
  });

  it("shows only what applies: hidden, without booking", () => {
    const [item] = toServiceListItems([
      { ...service, publiclyVisible: false, bookingEnabled: false },
    ]);
    expect(item!.statuses).toEqual([{ label: "Aktywna", tone: "success" }]);
    expect(item!.tags).toEqual(["active"]);
  });

  it("dims an inactive service, never on the site or bookable", () => {
    const [item] = toServiceListItems([{ ...service, active: false }]);
    expect(item).toMatchObject({
      statuses: [{ label: "Nieaktywna", tone: "neutral" }],
      tags: ["inactive"],
      muted: true,
    });
  });
});
