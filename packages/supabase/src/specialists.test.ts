import {
  specialistImageMetadataSchema,
  specialistProfileReviewInputSchema,
  specialistSlugSchema,
} from "@repo/contracts";
import { describe, expect, it } from "vitest";
import { specialistMappers } from "./specialists";

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
