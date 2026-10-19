import { defaultPageSeo } from "@repo/contracts";
import { describe, expect, it } from "vitest";
import {
  characterCount,
  mapPageSeoViewModel,
  seoPreview,
  shorten,
  toPageSeoContent,
} from "./seo-editor";

// A page's search and sharing settings in the CMS: the counters, the
// previews of a Google result and a shared link, the draft as saved.

describe("the character counters", () => {
  it("count the text against what Google shows", () => {
    expect(characterCount("O nas | Kolor Sensu", 60)).toEqual({
      label: "19 / 60",
      tooLong: false,
    });
    expect(characterCount("a".repeat(61), 60)).toEqual({
      label: "61 / 60",
      tooLong: true,
    });
  });

  it("leave out spaces at the ends", () => {
    expect(characterCount("  Kontakt  ", 60).label).toBe("7 / 60");
  });
});

describe("shorten", () => {
  it("keeps a text that fits", () => {
    expect(shorten("Kontakt", 10)).toBe("Kontakt");
  });

  it("cuts at a word, with an ellipsis", () => {
    expect(shorten("Psychoterapia indywidualna i terapia par", 30)).toBe(
      "Psychoterapia indywidualna i…",
    );
  });
});

describe("the previews", () => {
  it("show the page's own words where the draft is empty", () => {
    expect(
      seoPreview("about", defaultPageSeo, "https://www.kolorsensu.pl"),
    ).toEqual({
      breadcrumb: "kolorsensu.pl › o-nas",
      domain: "kolorsensu.pl",
      title: "O nas | Kolor Sensu",
      description:
        "Kolor Sensu to zespół psychoterapeutów i psychologów, którzy pracują z dorosłymi, parami, dziećmi i młodzieżą.",
      ogTitle: "O nas | Kolor Sensu",
      ogDescription:
        "Kolor Sensu to zespół psychoterapeutów i psychologów, którzy pracują z dorosłymi, parami, dziećmi i młodzieżą.",
    });
  });

  it("show the draft's words, the homepage under the domain alone", () => {
    const preview = seoPreview(
      "home",
      { ...defaultPageSeo, title: "Psychoterapia w Poznaniu", ogTitle: "Hej" },
      "https://ks-dev.ambrasystem.eu",
    );
    expect(preview.breadcrumb).toBe("ks-dev.ambrasystem.eu");
    expect(preview.title).toBe("Psychoterapia w Poznaniu");
    expect(preview.ogTitle).toBe("Hej");
  });

  it("cut a shared link's long description as the card does", () => {
    const preview = seoPreview(
      "home",
      { ...defaultPageSeo, ogDescription: "słowo ".repeat(40) },
      "https://kolorsensu.pl",
    );
    expect(preview.ogDescription.length).toBeLessThanOrEqual(120);
    expect(preview.ogDescription.endsWith("…")).toBe(true);
  });
});

describe("the draft", () => {
  const content = {
    draft: { ...defaultPageSeo, ogImagePath: "seo/a.jpg", ogImageAlt: "Sala" },
    published: null,
    publishedAt: null,
    updatedAt: "2026-10-19T10:00:00Z",
  };

  it("previews the picture by its address and counts as unpublished", () => {
    const model = mapPageSeoViewModel(content, (path) => `https://m/${path}`);
    expect(model.content.ogImageUrl).toBe("https://m/seo/a.jpg");
    expect(model.hasUnpublishedChanges).toBe(true);
  });

  it("is saved without the picture's address", () => {
    expect(
      toPageSeoContent({ ...content.draft, ogImageUrl: "https://m/x" }),
    ).toEqual(content.draft);
  });
});
