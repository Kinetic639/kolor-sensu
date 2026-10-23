// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  defaultClosingCta,
  defaultSpecialistsPage,
  type SpecialistsPageContent,
} from "@repo/contracts";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { SpecialistWithMedia } from "@/lib/public-data";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

// /specjalisci as a visitor gets it: the CMS's words, a card per published
// specialist (each to their profile), the line for an empty list, and
// "Nie wiesz, do kogo się zapisać?" with booking and Kontakt.

const person = (displayName: string, index: number) =>
  ({
    specialistId: `00000000-0000-4000-8000-00000000000${index}`,
    publicSlug: `osoba-${index}`,
    displayName,
    professionalTitle: "Psychoterapeutka",
    active: true,
    portraitUrl: null,
    photoUrl: null,
  }) as unknown as SpecialistWithMedia;

let specialists: SpecialistWithMedia[] = [];
let page: SpecialistsPageContent = defaultSpecialistsPage;
vi.mock("@/lib/public-data", () => ({
  getSpecialists: async () => specialists,
  getSpecialistsPage: async () => page,
  getClosingCta: async () => defaultClosingCta,
}));

let List: () => Promise<React.ReactElement>;
beforeAll(async () => {
  ({ default: List } = await import("./page"));
}, 60_000);

beforeEach(() => {
  specialists = [];
  page = defaultSpecialistsPage;
});
afterEach(cleanup);

describe("the specialists' list", () => {
  it("has the CMS's title as its one h1", async () => {
    page = {
      ...defaultSpecialistsPage,
      intro: {
        ...defaultSpecialistsPage.intro,
        title: [[{ text: "Nasz zespół", tone: "default" }]],
      },
    };
    render(await List());
    expect(
      screen
        .getAllByRole("heading", { level: 1 })
        .map((one) => one.textContent),
    ).toEqual([expect.stringContaining("Nasz zespół")]);
  });

  it("shows a card per published specialist, each leading to the profile", async () => {
    specialists = ["Anna Nowak", "Basia Lis"].map(person);
    render(await List());
    expect(
      screen.getByRole("heading", { level: 2, name: "Basia Lis" }),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link")
        .some((link) => link.getAttribute("href") === "/specjalisci/osoba-1"),
    ).toBe(true);
  });

  it("says when profiles are still to come, rather than showing nothing", async () => {
    render(await List());
    expect(
      screen.getByText(defaultSpecialistsPage.emptyText),
    ).toBeInTheDocument();
  });

  it("ends by helping to choose: booking and Kontakt", async () => {
    render(await List());
    const help = screen.getByRole("heading", {
      name: defaultSpecialistsPage.helpHeading,
    }).parentElement!.parentElement!;
    expect(
      within(help).getByRole("link", { name: /Umów wizytę/ }),
    ).toHaveAttribute("href", "/umow-wizyte");
    expect(
      within(help).getByRole("link", { name: "Skontaktuj się" }),
    ).toHaveAttribute("href", "/kontakt");
  });
});
