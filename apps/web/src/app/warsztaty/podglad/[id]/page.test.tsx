// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { PublicWorkshop } from "@repo/supabase/workshops";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// A draft workshop's preview for the admin (#197): the page as it will be
// published, with a word that sign-ups open once it is, and no sign-up;
// without the preview (or with a wrong id) nothing is found; never indexed.

const DAY = 24 * 60 * 60 * 1000;
const at = (days: number) => new Date(Date.now() + days * DAY).toISOString();

const draft: PublicWorkshop = {
  id: "w1",
  slug: "uwaznosc",
  title: "Uważność",
  shortDescription: "Krótko",
  body: null,
  audience: "Dla rodziców.",
  agenda: null,
  coverPath: null,
  coverAlt: null,
  seoTitle: null,
  seoDescription: null,
  modality: "online",
  status: "draft",
  startsAt: at(10),
  endsAt: at(10.1),
  priceMinor: 15000,
  currencyCode: "PLN",
  capacity: 12,
  minParticipants: null,
  locationName: null,
  locationAddress: null,
  locationDirections: null,
  locationCity: null,
  roomName: null,
  leaders: [],
  seatsLeft: 12,
  registrationOpen: false,
  confirmed: false,
  updatedAt: at(-1),
} as PublicWorkshop;

let found: PublicWorkshop | null = draft;
const getWorkshopPicks = vi.fn(async () => ({
  serviceIds: [] as string[],
  articleIds: [] as string[],
}));
vi.mock("@/lib/workshop-data", () => ({
  getWorkshopPreviewDraft: async () => found,
  getWorkshops: async () => [],
  getWorkshopPicks,
  workshopImageUrl: (path: string) => path,
}));
vi.mock("@/lib/public-data", () => ({
  getBookingWindow: async () => ({ timeZone: "Europe/Warsaw" }),
  getSpecialistOffers: async () => [],
  getWorkshopsPage: async () => ({ rules: [] }),
  getServices: async () => [],
  getSpecialists: async () => [],
}));
vi.mock("@/lib/education-data", () => ({
  getArticles: async () => [],
  getArticleCategories: async () => [],
  articleImageUrl: (path: string) => path,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
}));

let Preview: (props: {
  params: Promise<{ id: string }>;
}) => Promise<React.ReactElement>;
let metadata: { robots?: unknown };
beforeAll(async () => {
  ({ default: Preview, metadata } = (await import("./page")) as never);
}, 60_000);

afterEach(() => {
  cleanup();
  found = draft;
});

const open = async () =>
  render(await Preview({ params: Promise.resolve({ id: "w1" }) }));

describe("a draft workshop's preview (#197)", () => {
  it("shows the page as it will be, without signing up", async () => {
    await open();
    expect(
      screen.getByRole("heading", { level: 1, name: "Uważność" }),
    ).toBeVisible();
    expect(screen.getByText("Dla rodziców.")).toBeVisible();
    expect(
      screen.getByText(
        "Podgląd szkicu: zapisy ruszą, gdy opublikujesz warsztat.",
      ),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: /Zapisz się/ })).toBeNull();
    // The draft's own picks, read as the preview.
    expect(getWorkshopPicks).toHaveBeenCalledWith("w1", true);
  });

  it("is not found without the preview or with a wrong id", async () => {
    found = null;
    await expect(open()).rejects.toThrow("NOT_FOUND");
  });

  it("is never indexed", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
