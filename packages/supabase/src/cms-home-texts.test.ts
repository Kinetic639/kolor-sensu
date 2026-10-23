import {
  defaultHeroPoints,
  defaultHomeStory,
  defaultHomeThoughts,
} from "@repo/contracts";
import { describe, expect, it, vi } from "vitest";
import {
  getPublishedHomeContent,
  getPublishedHomeStory,
  getPublishedHomeThoughts,
  publishHomeStory,
  publishHomeThoughts,
  updateHomeStoryDraft,
  updateHomeThoughtsDraft,
} from "./cms";

// The homepage's words that moved into the CMS on 18.10: the hero's
// eyebrow, accent, points and photo; the thoughts band; the story's steps.

function reading(payload: unknown) {
  const eq = vi.fn(() => ({
    maybeSingle: vi.fn().mockResolvedValue({
      data: payload === null ? null : { key: "x", published_payload: payload },
      error: null,
    }),
  }));
  return { eq, client: { from: () => ({ select: () => ({ eq }) }) } as never };
}

function saving(payload: unknown) {
  const single = vi
    .fn()
    .mockResolvedValue({ data: { draft_payload: payload }, error: null });
  const eq = vi.fn(() => ({ select: () => ({ single }) }));
  const rpc = vi.fn().mockResolvedValue({ error: null });
  return {
    eq,
    rpc,
    client: { from: () => ({ update: () => ({ eq }) }), rpc } as never,
  };
}

describe("before anything is published", () => {
  it("shows the site's thoughts and story", async () => {
    const thoughts = reading(null);
    expect(await getPublishedHomeThoughts(thoughts.client)).toEqual(
      defaultHomeThoughts,
    );
    expect(thoughts.eq).toHaveBeenCalledWith("key", "home_thoughts");

    const story = reading(null);
    expect(await getPublishedHomeStory(story.client)).toEqual(defaultHomeStory);
    expect(story.eq).toHaveBeenCalledWith("key", "home_story");
  });
});

describe("thoughts published before the pairs", () => {
  it("read as pairs, each difficult thought with a kinder one", async () => {
    const { client } = reading({
      label: "Myśli",
      negative: ["a", "b", "c", "d", "e", "f", "g", "h"],
      positive: ["Spokój", "Oddech"],
    });
    const thoughts = await getPublishedHomeThoughts(client);
    expect(thoughts.label).toBe("Myśli");
    expect(thoughts.pairs).toHaveLength(8);
    expect(thoughts.pairs[0]).toEqual({ negative: "a", positive: "Spokój" });
    expect(thoughts.pairs.every((pair) => pair.positive)).toBe(true);
  });
});

describe("a hero published before its new fields", () => {
  it("reads with the site's eyebrow, accent and points", async () => {
    const { client } = reading({
      heading: "Więcej zrozumienia.",
      body: "Opis.",
      buttonLabel: null,
    });
    const hero = await getPublishedHomeContent(client);
    expect(hero?.eyebrow).toBe("Centrum psychoterapii i rozwoju");
    expect(hero?.accent).toBe("Więcej sensu.");
    expect(hero?.points).toEqual(defaultHeroPoints);
  });
});

describe("saving and publishing", () => {
  it("writes the thoughts and the story under their own keys", async () => {
    const cases = [
      [
        updateHomeThoughtsDraft,
        publishHomeThoughts,
        "home_thoughts",
        defaultHomeThoughts,
      ],
      [updateHomeStoryDraft, publishHomeStory, "home_story", defaultHomeStory],
    ] as const;
    for (const [update, publish, key, content] of cases) {
      const { eq, rpc, client } = saving(content);
      expect(await update(client, content as never)).toEqual(content);
      await publish(client);
      expect(eq).toHaveBeenCalledWith("key", key);
      expect(rpc).toHaveBeenCalledWith("publish_site_content", { p_key: key });
    }
  });

  it("refuses a story step that leads off the site", async () => {
    const { client } = saving(defaultHomeStory);
    const [step] = defaultHomeStory.steps;
    await expect(
      updateHomeStoryDraft(client, {
        steps: [{ ...step!, cta: { label: "Dalej", href: "https://x.pl" } }],
      }),
    ).rejects.toThrow();
  });
});
