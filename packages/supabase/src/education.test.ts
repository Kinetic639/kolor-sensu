import { emptyArticleDraft } from "@repo/contracts/education";
import { describe, expect, it, vi } from "vitest";
import {
  createArticle,
  getArticleSlugRedirect,
  listPublishedArticles,
  toPublishedArticle,
  uploadEbookSample,
} from "./education";

// Edukacja's reads and writes: the site asks for published rows only, by
// category or service; an old address leads to the new one; a draft of the
// wrong shape never reaches the database; a sample is a PDF of at most
// 20 MB.

function recording(result: unknown) {
  const calls: [string, ...unknown[]][] = [];
  const query: Record<string, unknown> = {};
  for (const name of ["select", "eq", "neq", "order", "limit", "maybeSingle"]) {
    query[name] = (...args: unknown[]) => {
      calls.push([name, ...args]);
      return query;
    };
  }
  (query as { then: unknown }).then = (resolve: (value: unknown) => void) =>
    resolve({ data: result, error: null });
  const client = { from: vi.fn(() => query) } as never;
  return { calls, client };
}

const row = {
  id: "a1",
  slug: "czym-jest-lek",
  title: "Czym jest lęk",
  lead: "Wstęp",
  cover_path: "articles/x.webp",
  cover_alt: "Okładka",
  category_id: "c1",
  body: { type: "doc", content: [{ type: "paragraph" }] },
  author_kind: "team",
  author_specialist_id: null,
  reviewer_specialist_id: null,
  sources: [],
  ebook_id: null,
  seo_title: "",
  seo_description: "",
  og_image_path: null,
  published_at: "2026-10-21T10:00:00Z",
  content_updated_at: null,
};

describe("the site's reads", () => {
  it("lists published articles only, newest first, by category", async () => {
    const { calls, client } = recording([row]);
    const articles = await listPublishedArticles(client, { categoryId: "c1" });
    expect(calls).toContainEqual(["eq", "status", "published"]);
    expect(calls).toContainEqual(["eq", "category_id", "c1"]);
    expect(calls).toContainEqual([
      "order",
      "published_at",
      { ascending: false },
    ]);
    expect(articles[0]).toMatchObject({
      slug: "czym-jest-lek",
      title: "Czym jest lęk",
    });
  });

  it("finds a service's articles through their links", async () => {
    const { calls, client } = recording([]);
    await listPublishedArticles(client, { serviceId: "s1", limit: 3 });
    expect(String(calls[0]![1])).toContain(
      "article_services!inner(service_id)",
    );
    expect(calls).toContainEqual(["eq", "article_services.service_id", "s1"]);
    expect(calls).toContainEqual(["limit", 3]);
  });

  it("leads an old address to the article's current one", async () => {
    const { client } = recording({
      articles: { slug: "lek-na-co-dzien", status: "published" },
    });
    expect(await getArticleSlugRedirect(client, "czym-jest-lek")).toBe(
      "lek-na-co-dzien",
    );
  });

  it("dates an article's update from its publication when never updated", () => {
    expect(toPublishedArticle(row).contentUpdatedAt).toBe(
      "2026-10-21T10:00:00Z",
    );
  });
});

describe("the admin's writes", () => {
  it("never send a draft of the wrong shape", async () => {
    const rpc = vi.fn();
    await expect(
      createArticle({ rpc } as never, {
        ...emptyArticleDraft(),
        slug: "Zły Adres",
      }),
    ).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("take a PDF of at most 20 MB as a sample", async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const client = { storage: { from: () => ({ upload }) } } as never;
    await expect(
      uploadEbookSample(
        client,
        new File(["x"], "a.png", { type: "image/png" }),
      ),
    ).rejects.toThrow("Fragment musi być plikiem PDF.");
    const big = new File(["x"], "a.pdf", { type: "application/pdf" });
    Object.defineProperty(big, "size", { value: 21 * 1024 * 1024 });
    await expect(uploadEbookSample(client, big)).rejects.toThrow("20 MB");
    expect(
      await uploadEbookSample(
        client,
        new File(["x"], "a.pdf", { type: "application/pdf" }),
      ),
    ).toMatch(/^ebooks\/[0-9a-f-]{36}\.pdf$/);
  });
});
