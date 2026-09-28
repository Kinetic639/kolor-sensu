import { emptyRichTextDocument, type RichTextDocument } from "@repo/contracts";
import { describe, expect, it } from "vitest";
import type {
  SpecialistDetailViewModel,
  SpecialistDraftViewModel,
} from "./types";
import { createProfileDiff } from "./view-model";

type Content = Omit<
  SpecialistDraftViewModel,
  "id" | "status" | "submittedAt" | "reviewComment"
>;

const snapshot: Content = {
  displayName: "Anna Kowalska",
  professionalTitle: "Psychoterapeutka",
  shortBio: "Opis",
  longBio: emptyRichTextDocument as RichTextDocument,
  profilePhotoUrl: "https://signed/a?token=1",
  profilePhotoPath: "s/profile-a.jpg",
  portraitPhotoUrl: null,
  portraitPhotoPath: null,
  languages: ["Polski"],
  therapyApproaches: [],
  specializations: [],
  education: [],
  certificates: [],
  modalities: [],
  clientGroups: ["Dorośli"],
};

function detail(draft: Partial<Content>): SpecialistDetailViewModel {
  return {
    id: "s",
    userId: "u",
    displayName: "Anna Kowalska",
    initials: "AK",
    avatarUrl: null,
    professionalTitle: "Psychoterapeutka",
    publicSlug: "anna",
    joinedAt: null,
    active: true,
    accountActive: true,
    acceptingNewClients: true,
    offers: [],
    publicProfile: {
      ...snapshot,
      publicationStatus: "published",
      publishedAt: null,
    },
    draft: {
      ...snapshot,
      // Every signed URL differs, even for the same file.
      profilePhotoUrl: "https://signed/a?token=2",
      ...draft,
      id: "d",
      status: "pending_review",
      submittedAt: null,
      reviewComment: null,
    },
  };
}

const byId = (fields: ReturnType<typeof createProfileDiff>, id: string) =>
  fields.find((field) => field.id === id);

describe("createProfileDiff", () => {
  it("treats the same stored photo as unchanged", () => {
    const fields = createProfileDiff(detail({}));
    expect(byId(fields, "profilePhoto")?.changed).toBe(false);
    expect(byId(fields, "portraitPhoto")?.changed).toBe(false);
  });

  it("shows a new photo with both images", () => {
    const fields = createProfileDiff(
      detail({
        portraitPhotoPath: "s/portrait-b.jpg",
        portraitPhotoUrl: "https://signed/b",
      }),
    );
    expect(byId(fields, "portraitPhoto")).toMatchObject({
      label: "Zdjęcie portretowe",
      changed: true,
      currentValue: "Brak zdjęcia",
      proposedValue: "Nowe zdjęcie",
      currentImageUrl: null,
      proposedImageUrl: "https://signed/b",
    });
  });

  it("reports a removed photo", () => {
    const fields = createProfileDiff(
      detail({ profilePhotoPath: null, profilePhotoUrl: null }),
    );
    expect(byId(fields, "profilePhoto")).toMatchObject({
      changed: true,
      proposedValue: "Zdjęcie usunięte",
    });
  });

  it("still compares the text fields", () => {
    const fields = createProfileDiff(
      detail({ languages: ["Polski", "Angielski"] }),
    );
    expect(byId(fields, "languages")).toMatchObject({
      changed: true,
      proposedValue: "Polski, Angielski",
    });
    expect(byId(fields, "displayName")?.changed).toBe(false);
  });

  it("shows who the specialist proposes to work with", () => {
    const fields = createProfileDiff(
      detail({ clientGroups: ["Dorośli", "Pary"] }),
    );
    expect(byId(fields, "clientGroups")).toMatchObject({
      label: "Z kim pracuje",
      changed: true,
      currentValue: "Dorośli",
      proposedValue: "Dorośli, Pary",
    });
  });
});

describe("createProfileDiff: title and rich text bio", () => {
  const bio = (text: string): RichTextDocument => ({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  });

  it("shows a proposed professional title", () => {
    const fields = createProfileDiff(
      detail({ professionalTitle: "Psycholog" }),
    );
    expect(byId(fields, "professionalTitle")).toMatchObject({
      label: "Tytuł zawodowy",
      currentValue: "Psychoterapeutka",
      proposedValue: "Psycholog",
      changed: true,
    });
  });

  it("compares the bio as a document and shows its text", () => {
    const fields = createProfileDiff(detail({ longBio: bio("Nowy opis") }));
    expect(byId(fields, "longBio")).toMatchObject({
      currentValue: "Brak",
      proposedValue: "Nowy opis",
      changed: true,
    });
  });

  it("notices formatting-only changes", () => {
    const bold: RichTextDocument = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Opis", marks: [{ type: "bold" }] }],
        },
      ],
    };
    const fields = createProfileDiff({
      ...detail({ longBio: bold }),
      publicProfile: {
        ...detail({}).publicProfile!,
        longBio: bio("Opis"),
      },
    });
    expect(byId(fields, "longBio")).toMatchObject({
      currentValue: "Opis",
      proposedValue: "Opis (zmienione formatowanie)",
      changed: true,
    });
  });
});
