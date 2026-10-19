// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

// A service's page, its two ways into booking (#94): "Umów wizytę" opens the
// wizard with this service chosen, and "Umów pierwsze spotkanie" with the
// first-visit consultation (the service that starts with the test).

const therapy = {
  id: "s2",
  slug: "terapia-par",
  name: "Terapia par",
  publicTitle: null,
  shortDescription: "Dla par.",
  description: null,
  defaultDurationMinutes: 80,
};

let bookable = true;

let service: typeof therapy | null = therapy;
let intake = new Set(["konsultacja-psychologiczna"]);
vi.mock("@/lib/public-data", () => ({
  getService: async () => service,
  getServices: async () => (service ? [service] : []),
  getServiceOffers: async () => [],
  getSpecialists: async () => [],
  getWatercolorLook: async () => ({}),
  getIntakeServiceSlugs: async () => intake,
  getBookableCatalog: async () => ({
    services: bookable && service ? [service] : [],
    offers: [],
  }),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

let Service: (props: {
  params: Promise<{ slug: string }>;
}) => Promise<React.ReactElement>;
beforeAll(async () => {
  ({ default: Service } = (await import("./page")) as never);
}, 60_000);

beforeEach(() => {
  service = therapy;
  bookable = true;
  intake = new Set(["konsultacja-psychologiczna"]);
});
afterEach(cleanup);

const open = async () =>
  render(await Service({ params: Promise.resolve({ slug: "terapia-par" }) }));

describe("booking from a service's page", () => {
  it("opens the wizard with this service chosen", async () => {
    await open();
    expect(screen.getByRole("link", { name: /Umów wizytę/ })).toHaveAttribute(
      "href",
      "/umow-wizyte?usluga=terapia-par",
    );
  });

  it("opens the first meeting with the first-visit consultation", async () => {
    await open();
    expect(
      screen.getByRole("link", { name: /Umów pierwsze spotkanie/ }),
    ).toHaveAttribute("href", "/umow-wizyte?usluga=konsultacja-psychologiczna");
  });

  it("opens the wizard as it is for a service not booked online", async () => {
    bookable = false;
    intake = new Set();
    await open();
    expect(screen.getByRole("link", { name: /Umów wizytę/ })).toHaveAttribute(
      "href",
      "/umow-wizyte",
    );
    expect(
      screen.getByRole("link", { name: /Umów pierwsze spotkanie/ }),
    ).toHaveAttribute("href", "/umow-wizyte");
  });
});
