import { describe, expect, it } from "vitest";
import { mapRoomsPageViewModel } from "./view-model";

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
