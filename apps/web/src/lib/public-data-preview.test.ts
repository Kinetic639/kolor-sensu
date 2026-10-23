import { defaultHomeHeaders } from "@repo/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The site's loaders read the published CMS content for visitors and the
// drafts in the CMS preview (Draft Mode), through the service-role client
// on the server; everything else stays on the public client either way.

const draft = { isEnabled: false };
let draftModeThrows = false;
vi.mock("next/headers", () => ({
  draftMode: () => {
    if (draftModeThrows) throw new Error("outside a request");
    return Promise.resolve(draft);
  },
}));

const publishedWhyUs = {
  visible: true,
  facts: [
    { title: "Opublikowane", text: "Jeden." },
    { title: "Opublikowane", text: "Dwa." },
  ],
};
const draftWhyUs = {
  visible: true,
  facts: [
    { title: "Szkic", text: "Jeden." },
    { title: "Szkic", text: "Dwa." },
  ],
};

const maybeSingle = vi.fn();
const from = vi.fn((_table: string) => ({
  select: () => ({ eq: () => ({ maybeSingle }) }),
}));
const publicRpc = vi.fn();
const createPublicClient = vi.fn(() => ({ from, rpc: publicRpc }));
vi.mock("@/lib/supabase/public", () => ({ createPublicClient }));

const rpc = vi.fn();
const createSecretClient = vi.fn(() => ({ rpc }));
vi.mock("@/lib/supabase/secret", () => ({ createSecretClient }));

async function loaders() {
  vi.resetModules();
  return import("./public-data");
}

beforeEach(() => {
  draft.isEnabled = false;
  draftModeThrows = false;
  maybeSingle.mockResolvedValue({
    data: { key: "why_us", published_payload: publishedWhyUs },
    error: null,
  });
  rpc.mockResolvedValue({ data: draftWhyUs, error: null });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("CMS loaders", () => {
  it("read the published content for a visitor", async () => {
    const { getWhyUs } = await loaders();

    expect(await getWhyUs()).toEqual(publishedWhyUs);
    expect(from).toHaveBeenCalledWith("site_content");
    expect(createSecretClient).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("read the draft in the preview, with the service-role client", async () => {
    draft.isEnabled = true;
    const { getWhyUs } = await loaders();

    expect(await getWhyUs()).toEqual(draftWhyUs);
    expect(rpc).toHaveBeenCalledWith("get_site_content_draft", {
      p_key: "why_us",
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("read the published content where there is no request", async () => {
    draftModeThrows = true;
    const { getWhyUs } = await loaders();

    expect(await getWhyUs()).toEqual(publishedWhyUs);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("fall back to the site's own content when a draft cannot be read", async () => {
    draft.isEnabled = true;
    rpc.mockResolvedValue({ data: null, error: new Error("denied") });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { getHomeHeaders } = await loaders();

    expect(await getHomeHeaders()).toEqual(defaultHomeHeaders);
  });

  it("keep other reads on the public client in the preview", async () => {
    draft.isEnabled = true;
    publicRpc.mockResolvedValue({ data: [], error: null });
    const { getCompany } = await loaders();

    expect(await getCompany()).toBeNull();
    expect(publicRpc).toHaveBeenCalledWith("company_details");
    expect(createSecretClient).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });
});
