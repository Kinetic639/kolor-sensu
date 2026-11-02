import {
  defaultCrisisHelp,
  defaultHomeHeaders,
  defaultHomeLocation,
  defaultNewsletterBand,
  defaultWhyUs,
} from "@repo/contracts";
import { describe, expect, it, vi } from "vitest";
import {
  getPublishedCrisisHelp,
  getPublishedHomeHeaders,
  getPublishedHomeLocation,
  getPublishedNewsletterBand,
  getPublishedWhyUs,
  publishCrisisHelp,
  publishHomeLocation,
  publishNewsletterBand,
  publishWhyUs,
  updateCrisisHelpDraft,
  updateHomeLocationDraft,
  updateNewsletterBandDraft,
  updateWhyUsDraft,
} from "./cms";

// The homepage's sections added on 18.10, read and written as the other
// CMS sections are: one site_content row each.

function readingNothing() {
  const eq = vi.fn(() => ({
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  }));
  return { eq, client: { from: () => ({ select: () => ({ eq }) }) } as never };
}

function reading(payload: unknown) {
  const eq = vi.fn(() => ({
    maybeSingle: vi.fn().mockResolvedValue({
      data: { key: "x", published_payload: payload },
      error: null,
    }),
  }));
  return { client: { from: () => ({ select: () => ({ eq }) }) } as never };
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
  it("reads existing crisis payloads with backwards-compatible editable intro fields", async () => {
    const legacy = {
      heading: "Wsparcie",
      text: "Opis",
      lines: [{ number: "123", label: "Linia", detail: "" }],
    };
    expect(await getPublishedCrisisHelp(reading(legacy).client)).toEqual({
      ...legacy,
      eyebrow: "Pomoc w kryzysie",
      moreLabel: "Więcej o pomocy w kryzysie",
    });
    const edited = { ...legacy, eyebrow: "Twój napis", moreLabel: "Twój link" };
    expect(await updateCrisisHelpDraft(saving(edited).client, edited)).toEqual(
      edited,
    );
    expect(await getPublishedCrisisHelp(reading(edited).client)).toEqual(
      edited,
    );
  });
  it("shows the site's defaults", async () => {
    const cases = [
      [getPublishedWhyUs, "why_us", defaultWhyUs],
      [getPublishedNewsletterBand, "newsletter_band", defaultNewsletterBand],
      [getPublishedHomeLocation, "home_location", defaultHomeLocation],
      [getPublishedCrisisHelp, "crisis_help", defaultCrisisHelp],
    ] as const;
    for (const [read, key, fallback] of cases) {
      const { eq, client } = readingNothing();
      expect(await read(client)).toEqual(fallback);
      expect(eq).toHaveBeenCalledWith("key", key);
    }
  });
});

describe("saving and publishing", () => {
  it("round-trips styled crisis headings together with the unchanged phone numbers", async () => {
    const styled = {
      ...defaultCrisisHelp,
      header: {
        eyebrow: { text: "Pomoc", tone: "green" as const },
        title: [
          [
            { text: "Potrzebujesz ", tone: "default" as const },
            { text: "pomocy?", tone: "pink" as const },
          ],
        ],
      },
    };
    expect(await updateCrisisHelpDraft(saving(styled).client, styled)).toEqual(
      styled,
    );
    expect(await getPublishedCrisisHelp(reading(styled).client)).toEqual(
      styled,
    );
  });
  it("writes each section under its own key", async () => {
    const whyUs = { ...defaultWhyUs, visible: true };
    const cases = [
      [updateWhyUsDraft, publishWhyUs, "why_us", whyUs],
      [
        updateNewsletterBandDraft,
        publishNewsletterBand,
        "newsletter_band",
        { visible: true },
      ],
      [
        updateHomeLocationDraft,
        publishHomeLocation,
        "home_location",
        { visible: false },
      ],
      [
        updateCrisisHelpDraft,
        publishCrisisHelp,
        "crisis_help",
        defaultCrisisHelp,
      ],
    ] as const;
    for (const [update, publish, key, content] of cases) {
      const { eq, rpc, client } = saving(content);
      expect(await update(client, content as never)).toEqual(content);
      await publish(client);
      expect(eq).toHaveBeenCalledWith("key", key);
      expect(rpc).toHaveBeenCalledWith("publish_site_content", { p_key: key });
    }
  });

  it("refuses a crisis line whose number is not a number", async () => {
    const { client } = saving(defaultCrisisHelp);
    await expect(
      updateCrisisHelpDraft(client, {
        ...defaultCrisisHelp,
        lines: [{ number: "zadzwoń", label: "Linia", detail: "" }],
      }),
    ).rejects.toThrow();
  });
});

describe("headers stored before the new sections", () => {
  // Until the migration that adds them has run (and while a deploy runs
  // ahead of it), the stored headers lack the new sections' headers.
  it("read with the site's own words for the new sections", async () => {
    const {
      whyUs: _whyUs,
      newsletter: _newsletter,
      location: _location,
      ...stored
    } = defaultHomeHeaders;
    const { client } = reading({ ...stored, faq: defaultHomeHeaders.story });
    expect(await getPublishedHomeHeaders(client)).toEqual(defaultHomeHeaders);
  });
});
