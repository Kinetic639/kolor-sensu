import { emptyRichTextDocument, type RichTextDocument } from "@repo/contracts";
import { describe, expect, it } from "vitest";
import type {
  SpecialistDetailViewModel,
  SpecialistDraftViewModel,
} from "./types";
import {
  createProfileDiff,
  mapSpecialistsListViewModel,
  toSpecialistListItems,
} from "./view-model";

type Content = Omit<
  SpecialistDraftViewModel,
  "id" | "status" | "submittedAt" | "reviewComment"
>;

const snapshot: Content = {
  firstName: "Anna",
  lastName: "Kowalska",
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
    color: null,
    accent: "var(--resource-1)",
    tint: "var(--resource-1-soft)",
    automaticAccent: "var(--resource-1)",
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
    expect(byId(fields, "firstName")?.changed).toBe(false);
  });

  it("compares the first and the last name each on its own", () => {
    const fields = createProfileDiff(
      detail({ lastName: "Nowak", displayName: "Anna Nowak" }),
    );
    expect(byId(fields, "firstName")).toMatchObject({
      label: "Imię",
      changed: false,
    });
    expect(byId(fields, "lastName")).toMatchObject({
      label: "Nazwisko",
      changed: true,
      currentValue: "Kowalska",
      proposedValue: "Nowak",
    });
    expect(byId(fields, "displayName")).toBeUndefined();
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

describe("mapSpecialistsListViewModel: colours", () => {
  const summary = {
    id: "specialist-1",
    userId: "user-1",
    firstName: "Anna",
    lastName: "Kowalska",
    avatarUrl: null,
    accountActive: true,
    active: true,
    acceptingNewClients: true,
    publicSlug: "anna-kowalska",
    professionalTitle: "Psychoterapeutka",
    joinedAt: null,
    color: "#7c3aed",
    publicDisplayName: "Anna Kowalska",
    publicProfilePhotoUrl: null,
    publicationStatus: "published" as const,
    pendingDraftId: null,
    pendingDraftSubmittedAt: null,
    serviceCount: 0,
  };

  it("shows each specialist in their colour, or the automatic one", () => {
    const { items } = mapSpecialistsListViewModel([
      summary,
      { ...summary, id: "specialist-2", color: null },
    ]);
    expect(items[0]!.accent).toBe("#7c3aed");
    // The whole avatar in their colour: a light tint behind the initials.
    expect(items[0]!.tint).toBe(
      "color-mix(in srgb, #7c3aed 8%, var(--surface))",
    );
    expect(items[1]!.accent).toMatch(/^var\(--resource-[1-6]\)$/);
  });

  it("shows the account's picture, else the published profile photo", () => {
    const photos = new Map([["anna/photo.webp", "https://signed/anna"]]);
    const { items } = mapSpecialistsListViewModel(
      [
        { ...summary, publicProfilePhotoUrl: "anna/photo.webp" },
        {
          ...summary,
          id: "specialist-2",
          avatarUrl: "https://account/jan.png",
          publicProfilePhotoUrl: "jan/photo.webp",
        },
        { ...summary, id: "specialist-3", publicProfilePhotoUrl: null },
      ],
      photos,
    );
    expect(items.map((item) => item.avatarUrl)).toEqual([
      "https://signed/anna",
      "https://account/jan.png",
      null,
    ]);
  });
});

describe("toSpecialistListItems", () => {
  const base = mapSpecialistsListViewModel([
    {
      id: "specialist-1",
      userId: "user-1",
      firstName: "Anna",
      lastName: "Kowalska",
      avatarUrl: null,
      accountActive: true,
      active: true,
      acceptingNewClients: true,
      publicSlug: "anna-kowalska",
      professionalTitle: "Psychoterapeutka",
      joinedAt: null,
      color: "#7c3aed",
      publicDisplayName: "Anna Kowalska",
      publicProfilePhotoUrl: null,
      publicationStatus: "published",
      pendingDraftId: null,
      pendingDraftSubmittedAt: null,
      serviceCount: 1,
    },
  ]).items[0]!;

  it("lists a specialist with their picture, title, services and statuses", () => {
    const [item] = toSpecialistListItems([base]);
    expect(item).toMatchObject({
      id: "specialist-1",
      href: "/specjalisci/specialist-1",
      name: "Anna Kowalska",
      description: "Psychoterapeutka",
      avatar: { url: null, initials: base.initials, accent: "#7c3aed" },
      facts: ["1 usługa"],
      statuses: [
        { label: "Aktywny", tone: "success" },
        { label: "Opublikowany", tone: "success" },
      ],
      tags: ["active"],
      muted: false,
    });
  });

  it("counts services in Polish", () => {
    const facts = [0, 2, 5, 12, 22].map(
      (serviceCount) =>
        toSpecialistListItems([{ ...base, serviceCount }])[0]!.facts,
    );
    expect(facts).toEqual([
      ["0 usług"],
      ["2 usługi"],
      ["5 usług"],
      ["12 usług"],
      ["22 usługi"],
    ]);
  });

  it("files a profile waiting for review under its filter", () => {
    const [item] = toSpecialistListItems([{ ...base, pendingDraft: true }]);
    expect(item!.tags).toEqual(["active", "pending"]);
    expect(item!.statuses).toContainEqual({
      label: "Do weryfikacji",
      tone: "warning",
    });
  });

  it("dims an inactive specialist, or one whose account is off", () => {
    for (const change of [{ active: false }, { accountActive: false }]) {
      const [item] = toSpecialistListItems([{ ...base, ...change }]);
      expect(item).toMatchObject({ tags: ["inactive"], muted: true });
      expect(item!.statuses![0]).toEqual({
        label: "Nieaktywny",
        tone: "neutral",
      });
    }
  });
});
