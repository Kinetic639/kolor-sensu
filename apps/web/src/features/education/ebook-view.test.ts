import { emptyRichTextDocument } from "@repo/contracts/rich-text";
import type { PublishedEbook } from "@repo/contracts/education";
import { describe, expect, it } from "vitest";
import { ebookCard, ebookSeo, videoEmbed } from "./ebook-view";

const ebook: PublishedEbook = {
  id: "e1",
  slug: "spokojny-sen",
  title: "Spokojny sen",
  coverPath: "ebooks/cover.webp",
  coverAlt: "Okładka",
  shortDescription: "O śnie",
  description: emptyRichTextDocument,
  audience: "",
  contents: [],
  format: "PDF, 48 stron",
  naffyUrl: "https://naffy.example.invalid/sen",
  videoUrl: "",
  samplePath: null,
  seoTitle: "",
  seoDescription: "",
  ogImagePath: null,
  publishedAt: "2026-10-21T10:00:00Z",
  contentUpdatedAt: "2026-10-21T10:00:00Z",
};

describe("an e-book's card and Google", () => {
  it("links to its page", () => {
    expect(ebookCard(ebook)).toMatchObject({
      href: "/edukacja/ebooki/spokojny-sen",
      description: "O śnie",
      format: "PDF, 48 stron",
    });
  });

  it("takes the SEO fields, else the title and short description", () => {
    expect(ebookSeo(ebook)).toEqual({
      title: "Spokojny sen",
      description: "O śnie",
    });
    expect(
      ebookSeo({ ...ebook, seoTitle: "Sen", seoDescription: "Opis" }),
    ).toEqual({ title: "Sen", description: "Opis" });
  });
});

describe("the film's player", () => {
  it("is YouTube's no-cookie one, from either link", () => {
    for (const url of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtube.com/watch?feature=share&v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
    ])
      expect(videoEmbed(url)).toEqual({
        provider: "YouTube",
        embedUrl:
          "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0",
      });
  });

  it("is Vimeo's without tracking", () => {
    expect(videoEmbed("https://vimeo.com/76979871")?.embedUrl).toBe(
      "https://player.vimeo.com/video/76979871?autoplay=1&dnt=1",
    );
  });

  it("is none for anything else", () => {
    expect(videoEmbed("")).toBeNull();
    expect(videoEmbed("https://evil.example/watch?v=x")).toBeNull();
    expect(videoEmbed("http://youtu.be/dQw4w9WgXcQ")).toBeNull();
  });
});
