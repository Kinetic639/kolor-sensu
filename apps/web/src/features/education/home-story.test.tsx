import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { homeStoryStepSchema } from "@repo/contracts";
import type {
  PublishedArticle,
  PublishedEbook,
} from "@repo/contracts/education";
import type { PublicWorkshop } from "@repo/supabase/workshops";
import { educationStorySteps } from "./home-story";

const readers = vi.hoisted(() => ({
  articles: vi.fn(),
  ebooks: vi.fn(),
  workshops: vi.fn(),
  categories: vi.fn(),
}));
vi.mock("@/lib/education-data", () => ({
  getArticles: readers.articles,
  getEbooks: readers.ebooks,
  getArticleCategories: readers.categories,
  articleImageUrl: (p: string) => `/${p}`,
}));
vi.mock("@/lib/workshop-data", () => ({
  getWorkshops: readers.workshops,
  workshopImageUrl: (p: string) => `/${p}`,
}));
vi.mock("@/lib/public-data", () => ({ getSpecialists: async () => [] }));
vi.mock("./article-view", () => ({
  articleHref: (slug: string) => `/edukacja/artykuly/${slug}`,
  readingLabel: () => "2 min czytania",
  articleAuthor: () => ({ name: "Anna Nowak", photoUrl: "/anna.webp" }),
  articleDate: () => "25 października 2026",
}));
const image = { src: "/fallback.jpg", alt: "Zdjęcie zastępcze" };
const article = (id: string, date: string) =>
  ({
    id,
    title: `Artykuł ${id}`,
    slug: id,
    publishedAt: date,
    lead: "Opis artykułu",
    coverPath: "cover.jpg",
    coverAlt: "Okładka",
    categoryId: "cat",
  }) as PublishedArticle;
const step = (media: unknown) => ({
  ...homeStoryStepSchema.parse({
    heading: "Wiedza",
    text: "Opis slajdu",
    media,
  }),
  imageUrl: null,
});
beforeEach(() => {
  vi.clearAllMocks();
  readers.articles.mockResolvedValue([]);
  readers.ebooks.mockResolvedValue([]);
  readers.workshops.mockResolvedValue([]);
  readers.categories.mockResolvedValue([]);
});
describe("the published education story", () => {
  it("includes an older primary ebook in auto mode and marks only it for mobile", async () => {
    const ids = [
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
      "33333333-3333-4333-8333-333333333333",
    ];
    readers.ebooks.mockResolvedValue(
      ids.map(
        (id, index) =>
          ({
            id,
            title: `Książka ${index + 1}`,
            slug: id,
            publishedAt: `2026-10-${25 - index}`,
            coverPath: "cover.jpg",
            coverAlt: "",
            format: "PDF",
          }) as PublishedEbook,
      ),
    );
    const result = await educationStorySteps(
      {
        steps: [
          step({
            type: "ebooks",
            source: "auto",
            ids: [],
            mobilePrimaryId: ids[2],
          }),
        ],
      },
      [image],
      {},
    );
    const html = renderToString(result[0]!.content);
    expect(html).toContain("Książka 3");
    expect(html).toContain("Książka 1");
    expect(html).not.toContain("Książka 2");
    expect(html.match(/data-mobile-primary="true"/g)).toHaveLength(1);
    expect(html.indexOf('data-mobile-primary="true"')).toBeLessThan(
      html.indexOf("Książka 3"),
    );
  });
  it("loads no catalogues for a photo slide", async () => {
    const result = await educationStorySteps(
      { steps: [step({ type: "image" })] },
      [image],
      {},
    );
    expect(result[0]?.content).toBeUndefined();
    expect(result[0]?.image).toEqual(image);
    expect(readers.articles).not.toHaveBeenCalled();
    expect(readers.workshops).not.toHaveBeenCalled();
  });
  it("shows only the three newest published articles in order", async () => {
    readers.articles.mockResolvedValue([
      article("old", "2026-01-01"),
      article("second", "2026-10-20"),
      article("newest", "2026-10-25"),
      article("third", "2026-10-15"),
    ]);
    const result = await educationStorySteps(
      { steps: [step({ type: "articles", source: "auto", ids: [] })] },
      [image],
      {},
    );
    const html = renderToString(result[0]!.content);
    expect(html).not.toContain("Artykuł old");
    expect(html.indexOf("Artykuł newest")).toBeLessThan(
      html.indexOf("Artykuł second"),
    );
    expect(html.indexOf("Artykuł second")).toBeLessThan(
      html.indexOf("Artykuł third"),
    );
    expect(html).not.toContain("Czytaj więcej artykułów");
    expect(html).toContain("Anna Nowak");
    expect(html).toContain("anna.webp");
    expect(html).toContain("25 października 2026");
  });
  it("falls back to the saved photo when manual references are withdrawn", async () => {
    const result = await educationStorySteps(
      {
        steps: [
          step({
            type: "ebooks",
            source: "manual",
            ids: ["11111111-1111-4111-8111-111111111111"],
          }),
        ],
      },
      [image],
      {},
    );
    expect(result[0]?.content).toBeUndefined();
    expect(result[0]?.image).toEqual(image);
  });
  it("keeps the admin's chosen ebook order", async () => {
    const ids = [
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
    ];
    readers.ebooks.mockResolvedValue(
      ids.map(
        (id, i) =>
          ({
            id,
            title: `Książka ${i + 1}`,
            slug: id,
            publishedAt: "2026-10-20",
            coverPath: "cover.jpg",
            coverAlt: "",
            format: "PDF",
          }) as PublishedEbook,
      ),
    );
    const result = await educationStorySteps(
      {
        steps: [
          step({
            type: "ebooks",
            source: "manual",
            ids: [...ids].reverse(),
            mobilePrimaryId: ids[0],
          }),
        ],
      },
      [image],
      {},
    );
    const html = renderToString(result[0]!.content);
    expect(html.indexOf("Książka 2")).toBeLessThan(html.indexOf("Książka 1"));
    expect(html).toMatch(
      /data-mobile-primary="false"[\s\S]*Książka 2[\s\S]*data-mobile-primary="true"[\s\S]*Książka 1/,
    );
  });
  it("falls back to the first published ebook when the primary is withdrawn", async () => {
    readers.ebooks.mockResolvedValue([
      {
        id: "11111111-1111-4111-8111-111111111111",
        title: "Dostępny e-book",
        slug: "dostepny",
        publishedAt: "2026-10-25",
        coverPath: "cover.jpg",
        coverAlt: "",
        format: "PDF",
      } as PublishedEbook,
    ]);
    const result = await educationStorySteps(
      {
        steps: [
          step({
            type: "ebooks",
            source: "auto",
            ids: [],
            mobilePrimaryId: "22222222-2222-4222-8222-222222222222",
          }),
        ],
      },
      [image],
      {},
    );
    expect(renderToString(result[0]!.content)).toMatch(
      /data-mobile-primary="true"[\s\S]*Dostępny e-book/,
    );
  });
  it("excludes cancelled and past workshops", async () => {
    readers.workshops.mockResolvedValue([
      { id: "cancelled", status: "cancelled", endsAt: "2099-01-01" },
      { id: "past", status: "published", endsAt: "2020-01-01" },
    ] as PublicWorkshop[]);
    const result = await educationStorySteps(
      { steps: [step({ type: "workshops", source: "auto", ids: [] })] },
      [image],
      {},
    );
    expect(result[0]?.content).toBeUndefined();
  });
  it("uses the standard workshop card with its price and seat availability", async () => {
    readers.workshops.mockResolvedValue([
      {
        id: "upcoming",
        slug: "spotkanie",
        title: "Wspólne spotkanie",
        status: "published",
        startsAt: "2099-01-01T10:00:00Z",
        endsAt: "2099-01-01T12:00:00Z",
        shortDescription: "Opis spotkania",
        modality: "online",
        coverPath: null,
        leaders: [],
        priceMinor: 15000,
        currencyCode: "PLN",
        seatsLeft: 8,
        capacity: 12,
        registrationOpen: true,
        body: null,
        audience: null,
        agenda: null,
        coverAlt: null,
        seoTitle: null,
        seoDescription: null,
        minParticipants: null,
        locationName: null,
        locationAddress: null,
        locationDirections: null,
        locationCity: null,
        roomName: null,
        confirmed: true,
        updatedAt: "2098-12-01T10:00:00Z",
      } as PublicWorkshop,
    ]);
    const result = await educationStorySteps(
      { steps: [step({ type: "workshops", source: "auto", ids: [] })] },
      [image],
      {},
    );
    const html = renderToString(result[0]!.content);
    expect(html).toContain("ks-wk__body");
    expect(html).toContain('data-variant="grid"');
    expect(html).toContain("ks-wk__price");
    expect(html).toContain("8 z 12");
    expect(html).toContain("Wspólne spotkanie");
    expect(html).toContain("ks-wk__wash");
    expect(html).not.toContain("ks-education-workshop-ticket");
  });
});
