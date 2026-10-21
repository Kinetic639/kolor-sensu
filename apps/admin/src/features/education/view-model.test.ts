import {
  emptyArticleDraft,
  emptyEbookDraft,
  TEAM_AUTHOR_NAME,
  type ArticleDraft,
  type EducationAdminRow,
} from "@repo/contracts/education";
import { describe, expect, it } from "vitest";
import { listHref } from "./search-params";
import {
  articleList,
  authorName,
  ebookList,
  followsTitle,
  segmentCounts,
  stateOf,
} from "./view-model";

const CATEGORY = "11111111-1111-4111-8111-111111111111";
const SPECIALIST = "22222222-2222-4222-8222-222222222222";

function article(
  id: string,
  draft: Partial<ArticleDraft>,
  row: Partial<EducationAdminRow<ArticleDraft>> = {},
): EducationAdminRow<ArticleDraft> {
  return {
    id,
    status: "draft",
    draft: { ...emptyArticleDraft(), ...draft },
    slug: null,
    publishedAt: null,
    updatedAt: "2026-10-21T10:00:00Z",
    hasUnpublishedChanges: false,
    ...row,
  };
}

const rows = [
  article("a", { title: "Lęk u dzieci", categoryId: CATEGORY }),
  article(
    "b",
    {
      title: "Sen i stres",
      authorKind: "specialist",
      authorSpecialistId: SPECIALIST,
    },
    { status: "published", slug: "sen-i-stres" },
  ),
  article(
    "c",
    { title: "" },
    { status: "published", slug: "c", hasUnpublishedChanges: true },
  ),
];
const categories = [
  {
    id: CATEGORY,
    slug: "dzieci",
    name: "Dzieci",
    description: "",
    sortOrder: 0,
  },
];
const specialists = [{ id: SPECIALIST, name: "Anna Nowak" }];

describe("Edukacja's lists", () => {
  it("counts the segments: changes are among the published", () => {
    expect(segmentCounts(rows)).toEqual({
      wszystkie: 3,
      szkice: 1,
      opublikowane: 2,
      zmiany: 1,
    });
  });

  it("says the state", () => {
    expect(stateOf(rows[0]!).label).toBe("Szkic");
    expect(stateOf(rows[1]!)).toEqual({
      label: "Opublikowany",
      tone: "success",
    });
    expect(stateOf(rows[2]!).tone).toBe("warning");
  });

  it("names the author: the team or the specialist", () => {
    expect(authorName(rows[0]!.draft, specialists)).toBe(TEAM_AUTHOR_NAME);
    expect(authorName(rows[1]!.draft, specialists)).toBe("Anna Nowak");
    expect(
      authorName(
        { authorKind: "specialist", authorSpecialistId: null },
        specialists,
      ),
    ).toBe("Autor nie wybrany");
  });

  it("filters articles by segment, category and search", () => {
    const all = { segment: "wszystkie", category: null, query: null } as const;
    expect(
      articleList(rows, categories, specialists, all).map((r) => r.id),
    ).toEqual(["a", "b", "c"]);
    expect(
      articleList(rows, categories, specialists, {
        ...all,
        category: CATEGORY,
      }),
    ).toMatchObject([{ id: "a", category: "Dzieci" }]);
    expect(
      articleList(rows, categories, specialists, {
        ...all,
        query: "nowak",
      }).map((r) => r.id),
    ).toEqual(["b"]);
    expect(
      articleList(rows, categories, specialists, { ...all, segment: "zmiany" }),
    ).toMatchObject([{ id: "c", title: "Bez tytułu" }]);
  });

  it("filters e-books by segment and search", () => {
    const ebooks = [
      {
        ...rows[0]!,
        id: "e1",
        draft: { ...emptyEbookDraft(), title: "Spokojny sen" },
      },
      {
        ...rows[1]!,
        id: "e2",
        draft: { ...emptyEbookDraft(), title: "Rodzic i emocje" },
      },
    ];
    expect(
      ebookList(ebooks, { segment: "opublikowane", query: null }).map(
        (r) => r.id,
      ),
    ).toEqual(["e2"]);
    expect(
      ebookList(ebooks, { segment: "wszystkie", query: "sen" }).map(
        (r) => r.id,
      ),
    ).toEqual(["e1"]);
  });

  it("keeps the view in the list's address", () => {
    expect(listHref("/artykuly", { stan: "wszystkie" })).toBe("/artykuly");
    expect(
      listHref("/artykuly", { stan: "szkice", kategoria: CATEGORY, q: "lęk" }),
    ).toBe(`/artykuly?stan=szkice&kategoria=${CATEGORY}&q=l%C4%99k`);
  });
});

describe("the address follows the title", () => {
  it("while it is new or untouched, and the item never published", () => {
    expect(followsTitle("nowy-artykul-abc", "", false)).toBe(true);
    expect(followsTitle("sen-i-stres", "sen-i-stres", false)).toBe(true);
    expect(followsTitle("moj-adres", "sen-i-stres", false)).toBe(false);
    expect(followsTitle("sen-i-stres", "sen-i-stres", true)).toBe(false);
  });
});
