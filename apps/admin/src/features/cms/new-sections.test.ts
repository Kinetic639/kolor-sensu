import { defaultCrisisHelp, defaultWhyUs } from "@repo/contracts";
import { describe, expect, it } from "vitest";
import { addItem, moveItem, removeItem } from "./list-editor";
import { mapContentViewModel } from "./view-model";

// The CMS's editors for the homepage's sections added on 18.10: the view
// of a section's draft, and the lists of facts and crisis lines.

describe("mapContentViewModel", () => {
  const content = {
    draft: defaultWhyUs,
    published: defaultWhyUs,
    publishedAt: "2026-10-18T10:00:00Z",
    updatedAt: "2026-10-18T11:00:00Z",
  };

  it("edits the draft and knows it is published as it stands", () => {
    const model = mapContentViewModel(content);
    expect(model.content).toEqual(defaultWhyUs);
    expect(model.isPublished).toBe(true);
    expect(model.hasUnpublishedChanges).toBe(false);
    expect(model.publishedAtLabel).not.toBeNull();
  });

  it("notices a draft that differs from what is published", () => {
    const model = mapContentViewModel({
      ...content,
      draft: { ...defaultWhyUs, visible: true },
    });
    expect(model.hasUnpublishedChanges).toBe(true);
  });

  it("counts a section never published as unpublished changes", () => {
    const model = mapContentViewModel({
      ...content,
      published: null,
      publishedAt: null,
    });
    expect(model.isPublished).toBe(false);
    expect(model.hasUnpublishedChanges).toBe(true);
    expect(model.publishedAtLabel).toBeNull();
  });
});

describe("the lists of facts and crisis lines", () => {
  const empty = { number: "", label: "", detail: "" };

  it("adds an empty item at the end, up to the most allowed", () => {
    const lines = defaultCrisisHelp.lines;
    expect(addItem(lines, empty, 6)).toEqual([...lines, empty]);
    const full = [...lines, empty, empty];
    expect(addItem(full, empty, 6)).toBe(full);
  });

  it("removes an item, never below the fewest allowed", () => {
    const facts = defaultWhyUs.facts;
    expect(removeItem(facts, 0, 2)).toEqual(facts.slice(1));
    const fewest = facts.slice(0, 2);
    expect(removeItem(fewest, 0, 2)).toBe(fewest);
  });

  it("moves an item up or down, staying inside the list", () => {
    const facts = defaultWhyUs.facts;
    expect(moveItem(facts, 1, -1).map((fact) => fact.title)).toEqual([
      "Poufność",
      "Superwizja",
      "Doświadczenie",
      "Kodeks etyczny",
    ]);
    expect(moveItem(facts, 0, -1)).toBe(facts);
    expect(moveItem(facts, 3, 1)).toBe(facts);
  });
});
