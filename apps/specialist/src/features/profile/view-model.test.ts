import {
  emptyRichTextDocument,
  type ClientGroup,
  type RichTextDocument,
  type Specialist,
  type SpecialistProfileDraft,
  type SpecialistPublicProfile,
} from "@repo/contracts";
import { describe, expect, it } from "vitest";
import { mapProfileEditorViewModel } from "./view-model";

const specialist: Specialist = {
  id: "20000000-0000-4000-8000-000000000001",
  userId: "user-id",
  active: true,
  publiclyVisible: true,
  publicSlug: "anna-kowalska",
  professionalTitle: "Psychoterapeutka",
  joinedAt: null,
  color: null,
  createdAt: "2026-09-01T10:00:00Z",
  updatedAt: "2026-09-01T10:00:00Z",
};

const content = {
  firstName: "Anna",
  lastName: "Kowalska",
  displayName: "Anna Kowalska",
  shortBio: "Opis",
  longBio: emptyRichTextDocument as RichTextDocument,
  profilePhotoUrl: `${specialist.id}/profile-1.jpg`,
  portraitPhotoUrl: null,
  languages: ["Polski"],
  therapyApproaches: ["CBT"],
  specializations: ["Lęk"],
  education: [],
  certificates: [],
  modalities: ["Spotkania online"],
  clientGroups: ["adults"] as ClientGroup[],
};

const published: SpecialistPublicProfile = {
  ...content,
  specialistId: specialist.id,
  publicSlug: specialist.publicSlug,
  active: true,
  professionalTitle: specialist.professionalTitle,
  joinedAt: null,
  publicationStatus: "published",
  publishedAt: "2026-09-10T10:00:00Z",
  createdAt: "2026-09-10T10:00:00Z",
  updatedAt: "2026-09-10T10:00:00Z",
};

function draft(
  status: SpecialistProfileDraft["status"],
  overrides: Partial<SpecialistProfileDraft> = {},
): SpecialistProfileDraft {
  return {
    ...content,
    id: "draft-id",
    specialistId: specialist.id,
    professionalTitle: "Psychoterapeutka",
    status,
    submittedAt: null,
    submittedBy: null,
    reviewedAt: null,
    reviewedBy: null,
    reviewComment: null,
    createdAt: "2026-09-20T10:00:00Z",
    updatedAt: "2026-09-21T08:30:00Z",
    ...overrides,
  };
}

const media = {
  profilePhotoUrl: "https://signed/profile",
  portraitPhotoUrl: null,
};
const base = {
  specialist,
  fallbackName: { firstName: "Anna", lastName: "Kowalska" },
  media,
  webUrl: "https://kolorsensu.pl",
};

describe("mapProfileEditorViewModel", () => {
  it("starts an empty profile from the account name", () => {
    const model = mapProfileEditorViewModel({
      ...base,
      published: null,
      draft: null,
      media: { profilePhotoUrl: null, portraitPhotoUrl: null },
    });

    expect(model.status).toBeNull();
    expect(model.editable).toBe(true);
    expect(model.values).toMatchObject({
      firstName: "Anna",
      lastName: "Kowalska",
    });
    expect(model.values).not.toHaveProperty("displayName");
    expect(model.values.specializations).toEqual([]);
    expect(model.values.clientGroups).toEqual([]);
    expect(model.publicUrl).toBeNull();
  });

  it("edits the open draft and reports its status", () => {
    const model = mapProfileEditorViewModel({
      ...base,
      published,
      draft: draft("draft", { shortBio: "Nowy opis" }),
    });

    expect(model.status).toBe("draft");
    expect(model.values.shortBio).toBe("Nowy opis");
    expect(model.values.clientGroups).toEqual(["adults"]);
    expect(model.lastModified).toBe("2026-09-21T08:30:00Z");
    expect(model.publicUrl).toBe(
      "https://kolorsensu.pl/specjalisci/anna-kowalska",
    );
  });

  it("locks the form while the draft waits for review", () => {
    const model = mapProfileEditorViewModel({
      ...base,
      published: null,
      draft: draft("pending_review"),
    });

    expect(model.status).toBe("pending_review");
    expect(model.editable).toBe(false);
  });

  it("keeps a rejected draft's content and the reviewer's comment", () => {
    const model = mapProfileEditorViewModel({
      ...base,
      published,
      draft: draft("rejected", {
        shortBio: "Odrzucony opis",
        reviewComment: "Rozwiń opis.",
      }),
    });

    expect(model.status).toBe("rejected");
    expect(model.editable).toBe(true);
    expect(model.values.shortBio).toBe("Odrzucony opis");
    expect(model.reviewComment).toBe("Rozwiń opis.");
  });

  it("edits the published profile once its draft was approved", () => {
    const model = mapProfileEditorViewModel({
      ...base,
      published: { ...published, shortBio: "Opublikowany" },
      draft: draft("published", { shortBio: "Stary szkic" }),
    });

    expect(model.status).toBe("published");
    expect(model.values.shortBio).toBe("Opublikowany");
    expect(model.lastModified).toBe("2026-09-10T10:00:00Z");
  });

  it("starts the title from the one set on the specialist", () => {
    const model = mapProfileEditorViewModel({
      ...base,
      published: null,
      draft: null,
      media: { profilePhotoUrl: null, portraitPhotoUrl: null },
    });
    expect(model.values.professionalTitle).toBe("Psychoterapeutka");
    expect(model.values.longBio).toEqual(emptyRichTextDocument);
  });

  it("edits the title proposed in an open draft", () => {
    const model = mapProfileEditorViewModel({
      ...base,
      published,
      draft: draft("draft", { professionalTitle: "Psycholog" }),
    });
    expect(model.values.professionalTitle).toBe("Psycholog");
  });

  it("carries signed photo URLs", () => {
    const model = mapProfileEditorViewModel({
      ...base,
      published,
      draft: null,
    });

    expect(model.values.professionalTitle).toBe("Psychoterapeutka");
    expect(model.photoPreviews).toEqual({
      profilePhotoUrl: "https://signed/profile",
      portraitPhotoUrl: null,
    });
    expect(model.values.profilePhotoUrl).toBe(`${specialist.id}/profile-1.jpg`);
  });
});
