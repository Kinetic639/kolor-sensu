// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Online booking switched off by the centre (Klient · 1, card 1): the
// wizard gives way to booking by phone or e-mail, with the centre's
// contact details; from a specialist's profile, it says who with.

const wizard = vi.hoisted(() => ({ loadWizard: vi.fn() }));
vi.mock("@/features/booking/load-wizard", () => wizard);
vi.mock("@/lib/public-data", () => ({
  getIntakeServiceSlugs: async () => [],
  getSpecialist: async (slug: string) =>
    slug === "anna-nowak"
      ? {
          publicSlug: "anna-nowak",
          displayName: "Anna Nowak",
          professionalTitle: "Psycholożka",
        }
      : null,
}));
vi.mock("@/lib/presentation", () => ({
  specialistHref: (slug: string) => `/specjalisci/${slug}`,
  specialistRole: (specialist: { professionalTitle: string }) =>
    specialist.professionalTitle,
}));
// The contact card reads the site's frame; here, its stand-in.
vi.mock("@/components/contact-details", () => ({
  ContactDetails: () => <p>Telefon i e-mail centrum</p>,
}));
vi.mock("@/features/booking/intake-cookie", () => ({ readIntake: vi.fn() }));
vi.mock("@/lib/page-metadata", () => ({ pageMetadata: vi.fn() }));

const { default: BookingPage } = await import("./page");
const { BookingContact } = await import("@/features/booking/booking-contact");

afterEach(cleanup);

async function renderPage(search: Record<string, string> = {}) {
  const page = await BookingPage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve(search),
  } as PageProps<"/umow-wizyte">);
  // The contact page is a server component of its own: rendered as such.
  expect(page.type).toBe(BookingContact);
  render(await BookingContact(page.props));
}

describe("online booking switched off (card 1)", () => {
  it("shows how to book by phone or e-mail instead of the wizard", async () => {
    wizard.loadWizard.mockResolvedValue(null);
    await renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: /Umów wizytę/ }),
    ).toBeVisible();
    expect(screen.getByText("Skontaktuj się z nami")).toBeVisible();
    expect(screen.getByText("Telefon i e-mail centrum")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Poznaj naszych specjalistów" }),
    ).toHaveAttribute("href", "/specjalisci");
    expect(
      screen.queryByRole("heading", { name: "Umów spotkanie" }),
    ).toBeNull();
  });

  it("from a specialist's profile, names who the visit is with", async () => {
    wizard.loadWizard.mockResolvedValue(null);
    await renderPage({ specjalista: "anna-nowak" });
    expect(
      screen.getByRole("heading", { name: "Umawiasz się z" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Anna Nowak" })).toHaveAttribute(
      "href",
      "/specjalisci/anna-nowak",
    );
  });
});
