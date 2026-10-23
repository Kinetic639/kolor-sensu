import { afterEach, describe, expect, it, vi } from "vitest";

// The painted photo's look on the site: the shared settings published in
// the admin's /cms, as image addresses; the site's own until then, and
// when the database cannot be read.

vi.mock("next/headers", () => ({
  draftMode: () => Promise.resolve({ isEnabled: false }),
}));

const maybeSingle = vi.fn();
const client = {
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  storage: {
    from: () => ({
      getPublicUrl: (path: string) => ({
        data: { publicUrl: `https://media.example.invalid/${path}` },
      }),
    }),
  },
};
vi.mock("@/lib/supabase/public", () => ({ createPublicClient: () => client }));

async function getWatercolorLook() {
  vi.resetModules();
  return (await import("./public-data")).getWatercolorLook();
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("the painted photo's look", () => {
  it("is the site's own until published (no parallax layer)", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await getWatercolorLook()).toEqual({ parallaxSrc: null });
  });

  it("uses the published backdrop and parallax layer", async () => {
    maybeSingle.mockResolvedValue({
      data: {
        key: "site_appearance",
        published_payload: {
          watercolorBackdropPath: "appearance/a.webp",
          watercolorParallaxPath: "appearance/b.png",
        },
      },
      error: null,
    });
    expect(await getWatercolorLook()).toEqual({
      watercolorSrc: "https://media.example.invalid/appearance/a.webp",
      parallaxSrc: "https://media.example.invalid/appearance/b.png",
    });
  });

  it("keeps the site's own look when the settings cannot be read", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    maybeSingle.mockRejectedValue(new Error("offline"));
    expect(await getWatercolorLook()).toEqual({});
  });
});
