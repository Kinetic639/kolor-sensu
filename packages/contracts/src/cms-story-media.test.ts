import { describe, expect, it } from "vitest";
import { homeStoryStepSchema, storyMediaOf } from "./cms";

const step = { heading: "Edukacja", text: "Wiedza na co dzień." };
const id = "11111111-1111-4111-8111-111111111111";
describe("home story media", () => {
  it("keeps legacy photo slides and recognizes the existing education links", () => {
    expect(storyMediaOf(homeStoryStepSchema.parse(step))).toEqual({
      type: "image",
    });
    expect(
      storyMediaOf(
        homeStoryStepSchema.parse({
          ...step,
          cta: { href: "/edukacja/artykuly", label: "Więcej artykułów" },
        }),
      ),
    ).toEqual({ type: "articles", source: "auto", ids: [] });
  });
  it("preserves a manual selection instead of copying material content", () => {
    const media = { type: "ebooks", source: "manual", ids: [id] };
    expect(homeStoryStepSchema.parse({ ...step, media }).media).toEqual(media);
  });
  it.each([
    { type: "unknown" },
    { type: "articles", source: "manual", ids: [] },
    { type: "articles", source: "manual", ids: [id, id] },
    { type: "ebooks", source: "manual", ids: ["not-an-id"] },
    {
      type: "workshops",
      source: "manual",
      ids: [id, "22222222-2222-4222-8222-222222222222"],
    },
  ])("rejects invalid or ambiguous media: %j", (media) => {
    expect(homeStoryStepSchema.safeParse({ ...step, media }).success).toBe(
      false,
    );
  });
});
