// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  arrangeOffer,
  defaultClosingCta,
  defaultPricesPage,
  type PricesPageContent,
} from "@repo/contracts";
import { cleanup, render, screen, within } from "@testing-library/react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

// /cennik as a visitor gets it: the CMS's words, every service's card in the
// offer's catalogues and order, each with its specialists' prices or the
// agreed-price line, the rules of payment and cancelling (how long before
// a visit it is cancelled free from the centre's settings), and, with no
// service yet, never an empty page.

const service = (
  id: string,
  name: string,
  sortOrder: number,
  catalogId: string | null = null,
) => ({
  id,
  slug: id,
  name,
  publicTitle: null,
  shortDescription: null,
  description: null,
  defaultDurationMinutes: 50,
  sortOrder,
  catalogId,
});

const consultation = service("konsultacja", "Konsultacja", 0);
const couples = service("terapia-par", "Terapia par", 1, "psychoterapia");
const individual = service(
  "terapia-indywidualna",
  "Terapia indywidualna",
  0,
  "psychoterapia",
);
const catalogs = [{ id: "psychoterapia", name: "Psychoterapia", sortOrder: 2 }];

const offerOf = (serviceSlug: string, priceMinor: number) => ({
  serviceId: serviceSlug,
  serviceName: serviceSlug,
  serviceSlug,
  specialistPublicSlug: "anna-nowak",
  specialistProfessionalTitle: null,
  priceMinor,
  currencyCode: "PLN",
  effectiveDurationMinutes: 50,
  supportsInPerson: true,
  supportsOnline: true,
});

let services = [consultation, couples, individual];
let words: PricesPageContent = defaultPricesPage;
let window: { cancellationWindowHours: number } | null = {
  cancellationWindowHours: 48,
};
const offers: Record<string, ReturnType<typeof offerOf>[]> = {
  konsultacja: [offerOf("konsultacja", 20000)],
  "terapia-indywidualna": [offerOf("terapia-indywidualna", 22000)],
  "terapia-par": [],
};

vi.mock("@/lib/public-data", () => ({
  getOffer: async () => arrangeOffer(services, catalogs),
  getPriceList: async () =>
    services.map((one) => ({ service: one, offers: offers[one.slug] ?? [] })),
  getSpecialists: async () => [
    { publicSlug: "anna-nowak", displayName: "Anna Nowak" },
  ],
  getPricesPage: async () => words,
  getBookingWindow: async () => window,
  getClosingCta: async () => defaultClosingCta,
}));

let Prices: () => Promise<React.ReactElement>;
beforeAll(async () => {
  ({ default: Prices } = (await import("./page")) as never);
}, 60_000);

beforeEach(() => {
  services = [consultation, couples, individual];
  words = defaultPricesPage;
  window = { cancellationWindowHours: 48 };
});
afterEach(cleanup);

const open = async () => render(await Prices());

describe("the price list", () => {
  it("has the CMS's title", async () => {
    words = {
      ...defaultPricesPage,
      intro: { ...defaultPricesPage.intro, heading: "Ceny wizyt" },
    };
    await open();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Ceny wizyt",
    );
  });

  it("stands in the offer's catalogues and order", async () => {
    await open();
    const titles = screen
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent);
    expect(titles).toEqual(["Terapia indywidualna", "Terapia par"]);
    const catalog = screen.getByRole("region", { name: "Psychoterapia" });
    expect(
      within(catalog).getByRole("heading", { name: "Terapia par" }),
    ).toBeVisible();
    // The loose service before the catalogue, as on Oferta.
    expect(
      screen.getByRole("heading", { level: 2, name: "Konsultacja" }),
    ).toBeVisible();
  });

  it("shows each specialist's price, or the agreed-price line", async () => {
    await open();
    expect(
      screen.getByRole("table", { name: "Ceny: Konsultacja" }),
    ).toHaveTextContent(/200/);
    expect(screen.getByText(defaultPricesPage.noPriceText)).toBeVisible();
  });

  it("says how long before a visit it is cancelled free, then the rules", async () => {
    await open();
    const rules = screen.getByRole("region", { name: "Płatności i odwołania" });
    expect(rules).toHaveTextContent(
      "Wizytę odwołasz z pełnym zwrotem opłaty najpóźniej 48 godz. przed jej początkiem.",
    );
    for (const rule of defaultPricesPage.rules) {
      expect(within(rules).getByText(rule.title)).toBeVisible();
    }
  });

  it("leaves the hours out when the settings cannot be read", async () => {
    window = null;
    await open();
    expect(
      screen.queryByText(/odwołasz z pełnym zwrotem/),
    ).not.toBeInTheDocument();
  });

  it("is never an empty page", async () => {
    services = [];
    await open();
    expect(screen.getByText(defaultPricesPage.emptyText)).toBeVisible();
  });
});
