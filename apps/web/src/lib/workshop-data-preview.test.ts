import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A draft workshop is read only in the CMS preview (Draft Mode, #197),
// through the service-role client; anyone else gets nothing, and nothing is
// read for them.

const draft = { isEnabled: false };
vi.mock("next/headers", () => ({ draftMode: () => Promise.resolve(draft) }));

const secretClient = { secret: true };
const createSecretClient = vi.fn(() => secretClient);
vi.mock("@/lib/supabase/secret", () => ({ createSecretClient }));
vi.mock("@/lib/supabase/public", () => ({ createPublicClient: vi.fn() }));

const getWorkshopPreview = vi.fn();
vi.mock("@repo/supabase/workshops", async (original) => ({
  ...(await original<object>()),
  getWorkshopPreview,
}));

async function loaders() {
  vi.resetModules();
  return import("./workshop-data");
}

beforeEach(() => {
  draft.isEnabled = false;
  getWorkshopPreview.mockResolvedValue({ id: "w1", title: "Szkic" });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("a draft workshop's preview (#197)", () => {
  it("is nothing outside the preview, read from nowhere", async () => {
    const { getWorkshopPreviewDraft } = await loaders();
    await expect(getWorkshopPreviewDraft("w1")).resolves.toBeNull();
    expect(getWorkshopPreview).not.toHaveBeenCalled();
    expect(createSecretClient).not.toHaveBeenCalled();
  });

  it("is the draft in the preview, read with the service-role client", async () => {
    draft.isEnabled = true;
    const { getWorkshopPreviewDraft } = await loaders();
    await expect(getWorkshopPreviewDraft("w1")).resolves.toEqual({
      id: "w1",
      title: "Szkic",
    });
    expect(getWorkshopPreview).toHaveBeenCalledWith(secretClient, "w1");
  });

  it("is nothing when the draft cannot be read", async () => {
    draft.isEnabled = true;
    getWorkshopPreview.mockRejectedValue(new Error("down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { getWorkshopPreviewDraft } = await loaders();
    await expect(getWorkshopPreviewDraft("w1")).resolves.toBeNull();
  });
});
