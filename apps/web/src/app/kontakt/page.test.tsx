// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { defaultContactPage, type ContactPageContent } from "@repo/contracts";
import type { SiteContact } from "@repo/ui/public-site";
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

// Kontakt as a visitor gets it: the CMS's words, the company's details with
// the hours, the map waiting for consent, how to get here, the form and the
// questions; and without the company's details, no promise of a map.

const contact: SiteContact = {
  address: { street: "ul. Długa 1", postalCode: "61-001", city: "Poznań" },
  phone: "+48611234567",
  phoneLabel: "+48 61 123 45 67",
  email: "kontakt@example.invalid",
  hours: "Pn–Pt 8:00–20:00",
};

let page: ContactPageContent = defaultContactPage;
let details: SiteContact | undefined = contact;
vi.mock("@/lib/public-data", () => ({
  getContactPage: async () => page,
  getCompany: async () => ({ legalName: "Kolor Sensu sp. z o.o." }),
}));
vi.mock("@/lib/site-frame", () => ({
  getSiteFrame: async () => ({ contact: details }),
}));
vi.mock("@/features/contact/actions", () => ({
  sendContactMessageAction: vi.fn(),
}));
vi.mock("@/features/booking/turnstile-widget", () => ({
  TurnstileWidget: () => null,
}));

let Contact: () => Promise<React.ReactElement>;
beforeAll(async () => {
  ({ default: Contact } = await import("./page"));
}, 60_000);

beforeEach(() => {
  page = defaultContactPage;
  details = contact;
});
afterEach(cleanup);

describe("Kontakt", () => {
  it("has the CMS's title as its one h1", async () => {
    page = {
      ...defaultContactPage,
      intro: {
        ...defaultContactPage.intro,
        title: [[{ text: "Napisz albo zadzwoń", tone: "default" }]],
      },
    };
    render(await Contact());
    expect(
      screen
        .getAllByRole("heading", { level: 1 })
        .map((one) => one.textContent),
    ).toEqual([expect.stringContaining("Napisz albo zadzwoń")]);
  });

  it("shows the address, a phone and e-mail to tap, and the hours", async () => {
    render(await Contact());
    expect(screen.getByText(/ul\. Długa 1/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /\+48 61 123 45 67/ }),
    ).toHaveAttribute("href", "tel:+48611234567");
    expect(
      screen.getByRole("link", { name: /kontakt@example\.invalid/ }),
    ).toHaveAttribute("href", "mailto:kontakt@example.invalid");
    expect(screen.getByText("Pn–Pt 8:00–20:00")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Pokaż na mapie/ }),
    ).toBeInTheDocument();
  });

  it("holds the map back until the visitor consents, and tells how to get here", async () => {
    page = {
      ...defaultContactPage,
      travel: "Tramwaj 2 i 5, przystanek Rynek.",
    };
    render(await Contact());
    expect(
      screen.getByRole("button", { name: "Pokaż mapę" }),
    ).toBeInTheDocument();
    expect(screen.queryByTitle(/Mapa:/)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Dojazd" })).toBeInTheDocument();
    expect(
      screen.getByText("Tramwaj 2 i 5, przystanek Rynek."),
    ).toBeInTheDocument();
  });

  it("has the form, under the CMS's heading", async () => {
    render(await Contact());
    const form = screen.getByRole("region", { name: "Napisz do nas" });
    expect(within(form).getByLabelText("Wiadomość")).toBeInTheDocument();
  });

  it("answers the CMS's questions, and leaves them out when there are none", async () => {
    render(await Contact());
    expect(screen.getByText("Czy potrzebuję skierowania?")).toBeInTheDocument();
    cleanup();

    page = { ...defaultContactPage, faq: [] };
    render(await Contact());
    expect(
      screen.queryByText("Czy potrzebuję skierowania?"),
    ).not.toBeInTheDocument();
  });

  it("promises no map without the company's details", async () => {
    details = undefined;
    render(await Contact());
    expect(screen.getByText(/Dane kontaktowe pojawią się/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Pokaż mapę" }),
    ).not.toBeInTheDocument();
  });
});
