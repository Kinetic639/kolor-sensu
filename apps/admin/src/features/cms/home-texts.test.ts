import {
  defaultHomeStory,
  homePageContentSchema,
  type HomeStoryContent,
  type SiteContentAdmin,
} from "@repo/contracts";
import { describe, expect, it } from "vitest";
import { mapHomeContentViewModel, mapHomeStoryViewModel } from "./view-model";

// The editors for the homepage's words that moved into the CMS on 19.10:
// the hero's new fields and the story's steps, with their photos.

const imageUrl = (path: string) => `https://cdn.example.invalid/${path}`;
const hero = homePageContentSchema.parse({ heading: "Tytuł", body: "Opis" });
const stamps = {
  publishedAt: "2026-10-19T08:00:00Z",
  updatedAt: "2026-10-19T09:00:00Z",
};

describe("mapHomeContentViewModel", () => {
  it("gives the editor every field and the photo's address", () => {
    const model = mapHomeContentViewModel(
      {
        draft: { ...hero, imagePath: "hero/a.webp", imageAlt: "Fotel" },
        published: hero,
        ...stamps,
      },
      imageUrl,
    );
    expect(model).toMatchObject({
      eyebrow: "Centrum psychoterapii i rozwoju",
      accent: "Więcej sensu.",
      points: hero.points,
      imagePath: "hero/a.webp",
      imageUrl: "https://cdn.example.invalid/hero/a.webp",
      hasUnpublishedChanges: true,
    });
  });

  it("sees a changed point as a change to publish", () => {
    const changed = {
      ...hero,
      points: [{ label: "Spokój", icon: "leaf" as const }],
    };
    expect(
      mapHomeContentViewModel(
        { draft: changed, published: hero, ...stamps },
        imageUrl,
      ).hasUnpublishedChanges,
    ).toBe(true);
    expect(
      mapHomeContentViewModel(
        { draft: hero, published: hero, ...stamps },
        imageUrl,
      ).hasUnpublishedChanges,
    ).toBe(false);
  });
});

describe("mapHomeStoryViewModel", () => {
  it("gives each step its photo's address, none without one", () => {
    const draft: HomeStoryContent = {
      steps: defaultHomeStory.steps.map((step, index) =>
        index === 0 ? { ...step, imagePath: "story/a.webp" } : step,
      ),
    };
    const content: SiteContentAdmin<HomeStoryContent> = {
      draft,
      published: null,
      ...stamps,
    };
    const model = mapHomeStoryViewModel(content, imageUrl);
    expect(model.content.steps.map((step) => step.imageUrl)).toEqual([
      "https://cdn.example.invalid/story/a.webp",
      null,
      null,
    ]);
    expect(model.isPublished).toBe(false);
  });
});
