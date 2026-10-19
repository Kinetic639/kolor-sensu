import { beforeEach, describe, expect, it, vi } from "vitest";

// The lasting address of a specialist's photo (for their data for Google).

let found: { photoUrl: string | null; portraitUrl: string | null } | null;
vi.mock("@/lib/public-data", () => ({ getSpecialist: async () => found }));

const { GET } = await import("./route");
const ask = (slug: string) =>
  GET(new Request("https://x.test"), {
    params: Promise.resolve({ slug }),
  } as never);

beforeEach(() => {
  found = null;
});

describe("a specialist's photo", () => {
  it("sends to a freshly signed photo, the photo before the portrait", async () => {
    found = {
      photoUrl: "https://cdn.test/photo.jpg",
      portraitUrl: "https://cdn.test/p.png",
    };
    const response = await ask("anna-nowak");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://cdn.test/photo.jpg");
  });

  it("is not found without a published profile or a photo", async () => {
    expect((await ask("nikt")).status).toBe(404);
    found = { photoUrl: null, portraitUrl: null };
    expect((await ask("anna-nowak")).status).toBe(404);
  });
});
