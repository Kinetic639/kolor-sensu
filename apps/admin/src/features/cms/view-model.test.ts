import { describe, expect, it } from "vitest";
import { mapRoomsPageViewModel, mapSupportAreasViewModel } from "./view-model";

const base = {
  draft: { showAmenitiesSection: true, showLocationDetails: false },
  published: { showAmenitiesSection: true, showLocationDetails: true },
  publishedAt: "2026-09-27T10:00:00Z",
  updatedAt: "2026-09-27T11:00:00Z",
};

describe("mapRoomsPageViewModel", () => {
  it("edits the draft and notices it differs from what is published", () => {
    const model = mapRoomsPageViewModel(base);
    expect(model).toMatchObject({
      showAmenitiesSection: true,
      showLocationDetails: false,
      isPublished: true,
      hasUnpublishedChanges: true,
    });
    expect(model.publishedAtLabel).not.toBeNull();
  });

  it("has nothing to publish when the draft matches", () => {
    expect(
      mapRoomsPageViewModel({ ...base, draft: base.published })
        .hasUnpublishedChanges,
    ).toBe(false);
  });

  it("treats a never-published page as having changes", () => {
    const model = mapRoomsPageViewModel({
      ...base,
      published: null,
      publishedAt: null,
    });
    expect(model.isPublished).toBe(false);
    expect(model.hasUnpublishedChanges).toBe(true);
    expect(model.publishedAtLabel).toBeNull();
  });
});

describe("mapSupportAreasViewModel", () => {
  const area = {
    id: "indywidualna",
    title: "Terapia indywidualna",
    lead: "Opis.",
    imagePath: "support-areas/a.webp",
    imageAlt: "Gabinet",
    link: null,
  };
  const content = {
    draft: { areas: [area] },
    published: { areas: [area] },
    publishedAt: "2026-10-13T10:00:00Z",
    updatedAt: "2026-10-13T11:00:00Z",
  };
  const url = (path: string) => `https://cdn.test/${path}`;

  it("lists the draft's areas, each photo as an address to preview", () => {
    const model = mapSupportAreasViewModel(content, url);
    expect(model.areas).toEqual([
      { ...area, imageUrl: "https://cdn.test/support-areas/a.webp" },
    ]);
    expect(model.isPublished).toBe(true);
    expect(model.hasUnpublishedChanges).toBe(false);
  });

  it("notices a draft that differs from what is published", () => {
    const model = mapSupportAreasViewModel(
      { ...content, draft: { areas: [{ ...area, title: "Inny tytuł" }] } },
      url,
    );
    expect(model.hasUnpublishedChanges).toBe(true);
  });

  it("treats never-published areas as having changes, without photos as none", () => {
    const model = mapSupportAreasViewModel(
      {
        ...content,
        draft: { areas: [{ ...area, imagePath: null }] },
        published: null,
        publishedAt: null,
      },
      url,
    );
    expect(model.isPublished).toBe(false);
    expect(model.hasUnpublishedChanges).toBe(true);
    expect(model.areas[0]?.imageUrl).toBeNull();
  });
});
