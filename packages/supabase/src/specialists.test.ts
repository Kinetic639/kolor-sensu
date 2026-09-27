import {
  emptyRichTextDocument,
  specialistImageMetadataSchema,
  specialistProfileReviewInputSchema,
  specialistProfileSubmissionSchema,
  specialistSlugSchema,
} from "@repo/contracts";
import { describe, expect, it, vi } from "vitest";
import {
  buildSpecialistMediaPath,
  specialistMappers,
  uploadSpecialistProfileImage,
  validateSpecialistImage,
} from "./specialists";

const specialistId = "20000000-0000-4000-8000-000000000001";

describe("specialist profile images", () => {
  it("accepts JPEG, PNG and WebP files up to 5 MB", () => {
    expect(validateSpecialistImage({ type: "image/jpeg", size: 1024 })).toBe(
      null,
    );
    expect(
      validateSpecialistImage({ type: "image/webp", size: 5 * 1024 * 1024 }),
    ).toBe(null);
  });

  it("rejects other types and larger files with a readable message", () => {
    expect(validateSpecialistImage({ type: "image/gif", size: 1024 })).toMatch(
      /JPG, PNG lub WebP/,
    );
    expect(
      validateSpecialistImage({ type: "image/png", size: 5 * 1024 * 1024 + 1 }),
    ).toMatch(/5 MB/);
  });

  it("builds a unique path inside the specialist's folder", () => {
    const path = buildSpecialistMediaPath(
      specialistId,
      "portrait",
      "image/jpeg",
      "a1b2",
    );
    expect(path).toBe(`${specialistId}/portrait-a1b2.jpg`);
    expect(
      specialistImageMetadataSchema.safeParse({
        bucket: "specialist-profile-media",
        path,
        mimeType: "image/jpeg",
        size: 1,
      }).success,
    ).toBe(true);
  });

  it("uploads to the private bucket and returns the stored path", async () => {
    const upload = vi.fn().mockResolvedValue({ data: {}, error: null });
    const from = vi.fn().mockReturnValue({ upload });
    const client = { storage: { from } } as never;
    const file = new File(["x"], "anna.png", { type: "image/png" });

    const path = await uploadSpecialistProfileImage(client, {
      specialistId,
      kind: "profile",
      file,
    });

    expect(from).toHaveBeenCalledWith("specialist-profile-media");
    expect(path).toMatch(
      new RegExp(`^${specialistId}/profile-[0-9a-f-]+\\.png$`),
    );
    expect(upload).toHaveBeenCalledWith(path, file, {
      contentType: "image/png",
      upsert: false,
    });
  });

  it("refuses invalid files before contacting storage", async () => {
    const from = vi.fn();
    const client = { storage: { from } } as never;
    const file = new File(["x"], "a.gif", { type: "image/gif" });

    await expect(
      uploadSpecialistProfileImage(client, {
        specialistId,
        kind: "profile",
        file,
      }),
    ).rejects.toThrow(/JPG, PNG lub WebP/);
    expect(from).not.toHaveBeenCalled();
  });
});

describe("specialist domain schemas", () => {
  it("accepts stable URL-safe slugs and rejects unsafe values", () => {
    expect(specialistSlugSchema.safeParse("anna-maria").success).toBe(true);
    expect(specialistSlugSchema.safeParse("Anna Maria").success).toBe(false);
  });

  it("requires a rejection comment", () => {
    expect(
      specialistProfileReviewInputSchema.safeParse({
        action: "reject",
        draftId: "20000000-0000-4000-8000-000000000001",
        comment: "",
      }).success,
    ).toBe(false);
  });

  it("validates specialist-owned image metadata", () => {
    expect(
      specialistImageMetadataSchema.safeParse({
        bucket: "specialist-profile-media",
        path: "20000000-0000-4000-8000-000000000001/portrait.webp",
        mimeType: "image/webp",
        size: 1024,
      }).success,
    ).toBe(true);
    expect(
      specialistImageMetadataSchema.safeParse({
        bucket: "specialist-profile-media",
        path: "portrait.svg",
        mimeType: "image/svg+xml",
        size: 1024,
      }).success,
    ).toBe(false);
  });
});

describe("specialist profile submission", () => {
  const complete = {
    displayName: "Anna Kowalska",
    professionalTitle: "Psychoterapeutka",
    shortBio: "Pomagam dorosłym.",
    longBio: emptyRichTextDocument,
    profilePhotoUrl: null,
    portraitPhotoUrl: null,
    languages: ["Polski"],
    therapyApproaches: ["CBT"],
    specializations: ["Zaburzenia lękowe"],
    education: [],
    certificates: [],
    modalities: ["Spotkania online"],
  };

  it("accepts a profile with every field the public page needs", () => {
    expect(specialistProfileSubmissionSchema.safeParse(complete).success).toBe(
      true,
    );
  });

  it("rejects a full bio that is not a rich text document", () => {
    expect(
      specialistProfileSubmissionSchema.safeParse({
        ...complete,
        longBio: "Zwykły tekst",
      }).success,
    ).toBe(false);
  });

  it("names each missing required field", () => {
    const result = specialistProfileSubmissionSchema.safeParse({
      ...complete,
      displayName: " ",
      professionalTitle: "",
      shortBio: "",
      specializations: [],
      therapyApproaches: [],
      modalities: [],
    });
    expect(result.success).toBe(false);
    expect(
      result.error?.issues.map((issue) => issue.path.join(".")).sort(),
    ).toEqual([
      "displayName",
      "modalities",
      "professionalTitle",
      "shortBio",
      "specializations",
      "therapyApproaches",
    ]);
  });
});

describe("specialist domain mapping", () => {
  it("maps database naming into client-agnostic domain naming", () => {
    expect(
      specialistMappers.specialist({
        id: "specialist-id",
        user_id: "user-id",
        active: true,
        accepting_new_clients: false,
        public_slug: "anna-maria",
        professional_title: null,
        joined_at: null,
        created_at: "2026-09-19T00:00:00Z",
        updated_at: "2026-09-19T00:00:00Z",
      }),
    ).toMatchObject({
      id: "specialist-id",
      userId: "user-id",
      publicSlug: "anna-maria",
      acceptingNewClients: false,
    });
  });

  it("maps the lightweight admin summary", () => {
    expect(
      specialistMappers.adminSummary({
        id: "specialist-id",
        user_id: "user-id",
        active: true,
        accepting_new_clients: true,
        public_slug: "anna-kowalska",
        professional_title: "Psychoterapeutka",
        joined_at: "2026-09-01T00:00:00Z",
        created_at: "2026-09-01T00:00:00Z",
        updated_at: "2026-09-01T00:00:00Z",
        profile: {
          id: "user-id",
          first_name: "Anna",
          last_name: "Kowalska",
          avatar_url: null,
          active: true,
        },
        public_profile: {
          display_name: "Anna Kowalska",
          profile_photo_url: null,
          publication_status: "published",
        },
        drafts: [
          {
            id: "draft-id",
            status: "pending_review",
            submitted_at: "2026-09-20T00:00:00Z",
          },
        ],
        offers: [{ id: "offer-1" }, { id: "offer-2" }],
      }),
    ).toMatchObject({
      id: "specialist-id",
      publicDisplayName: "Anna Kowalska",
      pendingDraftId: "draft-id",
      serviceCount: 2,
    });
  });
});

describe("specialist draft mapping", () => {
  const draftRow = {
    id: "draft-id",
    specialist_id: "specialist-id",
    display_name: "Anna Kowalska",
    professional_title: "Psychoterapeutka",
    short_bio: "Opis",
    long_bio: {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Akapit" }] },
      ],
    },
    profile_photo_url: null,
    portrait_photo_url: null,
    languages: [],
    therapy_approaches: [],
    specializations: [],
    education: [],
    certificates: [],
    modalities: [],
    status: "draft" as const,
    submitted_at: null,
    submitted_by: null,
    reviewed_at: null,
    reviewed_by: null,
    review_comment: null,
    created_at: "2026-09-27T00:00:00Z",
    updated_at: "2026-09-27T00:00:00Z",
  };

  it("maps the title and the rich text bio", () => {
    expect(specialistMappers.draft(draftRow)).toMatchObject({
      professionalTitle: "Psychoterapeutka",
      longBio: draftRow.long_bio,
    });
  });

  it("falls back to an empty document for an invalid stored bio", () => {
    expect(
      specialistMappers.draft({ ...draftRow, long_bio: { type: "nope" } })
        .longBio,
    ).toEqual(emptyRichTextDocument);
  });
});
