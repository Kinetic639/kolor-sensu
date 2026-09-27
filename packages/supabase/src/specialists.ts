import {
  emptyRichTextDocument,
  richTextDocumentSchema,
  specialistProfileDraftInputSchema,
  specialistProfileReviewInputSchema,
  specialistSlugSchema,
  type Specialist,
  type SpecialistProfileDraft,
  type SpecialistProfileDraftInput,
  type SpecialistPublicProfile,
} from "@repo/contracts";
import type { Database, Json } from "@repo/contracts/database";
import type { SupabaseClient } from "@supabase/supabase-js";

type SpecialistRow = Database["public"]["Tables"]["specialists"]["Row"];
type PublicProfileRow =
  Database["public"]["Tables"]["specialist_public_profiles"]["Row"];
type DraftRow =
  Database["public"]["Tables"]["specialist_profile_drafts"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

// Stored bios are validated again on read; an unreadable one shows as empty
// instead of breaking the page.
function readRichText(value: unknown) {
  const parsed = richTextDocumentSchema.safeParse(value);
  return parsed.success ? parsed.data : emptyRichTextDocument;
}

const specialistMediaBucket = "specialist-profile-media";

type AdminSpecialistSummaryRow = SpecialistRow & {
  profile: Pick<
    ProfileRow,
    "id" | "first_name" | "last_name" | "avatar_url" | "active"
  >;
  public_profile: Pick<
    PublicProfileRow,
    "display_name" | "profile_photo_url" | "publication_status"
  > | null;
  drafts: Pick<DraftRow, "id" | "status" | "submitted_at">[];
  offers: { id: string }[];
};

export interface AdminSpecialistSummary {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  accountActive: boolean;
  active: boolean;
  acceptingNewClients: boolean;
  publicSlug: string;
  professionalTitle: string | null;
  joinedAt: string | null;
  publicDisplayName: string | null;
  publicProfilePhotoUrl: string | null;
  publicationStatus: SpecialistPublicProfile["publicationStatus"] | null;
  pendingDraftId: string | null;
  pendingDraftSubmittedAt: string | null;
  serviceCount: number;
}

type PublicProfileQueryRow = PublicProfileRow & {
  specialists: Pick<
    SpecialistRow,
    | "id"
    | "active"
    | "accepting_new_clients"
    | "public_slug"
    | "professional_title"
    | "joined_at"
  >;
};

function mapSpecialist(row: SpecialistRow): Specialist {
  return {
    id: row.id,
    userId: row.user_id,
    active: row.active,
    acceptingNewClients: row.accepting_new_clients,
    publicSlug: row.public_slug,
    professionalTitle: row.professional_title,
    joinedAt: row.joined_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPublicProfile(row: PublicProfileQueryRow): SpecialistPublicProfile {
  return {
    specialistId: row.specialist_id,
    publicSlug: row.specialists.public_slug,
    active: row.specialists.active,
    acceptingNewClients: row.specialists.accepting_new_clients,
    professionalTitle: row.specialists.professional_title,
    joinedAt: row.specialists.joined_at,
    displayName: row.display_name,
    shortBio: row.short_bio,
    longBio: readRichText(row.long_bio),
    profilePhotoUrl: row.profile_photo_url,
    portraitPhotoUrl: row.portrait_photo_url,
    languages: row.languages,
    therapyApproaches: row.therapy_approaches,
    specializations: row.specializations,
    education: row.education,
    certificates: row.certificates,
    modalities: row.modalities,
    publicationStatus: row.publication_status,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDraft(row: DraftRow): SpecialistProfileDraft {
  return {
    id: row.id,
    specialistId: row.specialist_id,
    displayName: row.display_name,
    professionalTitle: row.professional_title,
    shortBio: row.short_bio,
    longBio: readRichText(row.long_bio),
    profilePhotoUrl: row.profile_photo_url,
    portraitPhotoUrl: row.portrait_photo_url,
    languages: row.languages,
    therapyApproaches: row.therapy_approaches,
    specializations: row.specializations,
    education: row.education,
    certificates: row.certificates,
    modalities: row.modalities,
    status: row.status,
    submittedAt: row.submitted_at,
    submittedBy: row.submitted_by,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
    reviewComment: row.review_comment,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAdminSpecialistSummary(
  row: AdminSpecialistSummaryRow,
): AdminSpecialistSummary {
  const pendingDraft = row.drafts.find(
    (draft) => draft.status === "pending_review",
  );

  return {
    id: row.id,
    userId: row.user_id,
    firstName: row.profile.first_name,
    lastName: row.profile.last_name,
    avatarUrl: row.profile.avatar_url,
    accountActive: row.profile.active,
    active: row.active,
    acceptingNewClients: row.accepting_new_clients,
    publicSlug: row.public_slug,
    professionalTitle: row.professional_title,
    joinedAt: row.joined_at,
    publicDisplayName: row.public_profile?.display_name ?? null,
    publicProfilePhotoUrl: row.public_profile?.profile_photo_url ?? null,
    publicationStatus: row.public_profile?.publication_status ?? null,
    pendingDraftId: pendingDraft?.id ?? null,
    pendingDraftSubmittedAt: pendingDraft?.submitted_at ?? null,
    serviceCount: row.offers.length,
  };
}

const publicProfileSelection = `
  specialist_id,
  display_name,
  short_bio,
  long_bio,
  profile_photo_url,
  portrait_photo_url,
  languages,
  therapy_approaches,
  specializations,
  education,
  certificates,
  modalities,
  publication_status,
  published_at,
  created_at,
  updated_at,
  specialists!inner (
    id,
    active,
    accepting_new_clients,
    public_slug,
    professional_title,
    joined_at
  )
`;

export async function listPublishedSpecialists(
  client: SupabaseClient<Database>,
): Promise<SpecialistPublicProfile[]> {
  const { data, error } = await client
    .from("specialist_public_profiles")
    .select(publicProfileSelection)
    .eq("publication_status", "published")
    .eq("specialists.active", true)
    .order("published_at", { ascending: false });

  if (error) throw error;
  return (data as PublicProfileQueryRow[]).map(mapPublicProfile);
}

export async function getPublishedSpecialistBySlug(
  client: SupabaseClient<Database>,
  slug: string,
): Promise<SpecialistPublicProfile | null> {
  const publicSlug = specialistSlugSchema.parse(slug);
  const { data, error } = await client
    .from("specialist_public_profiles")
    .select(publicProfileSelection)
    .eq("publication_status", "published")
    .eq("specialists.active", true)
    .eq("specialists.public_slug", publicSlug)
    .maybeSingle();

  if (error) throw error;
  return data ? mapPublicProfile(data as PublicProfileQueryRow) : null;
}

export async function getMySpecialist(
  client: SupabaseClient<Database>,
  userId?: string,
): Promise<Specialist | null> {
  let currentUserId = userId;
  if (!currentUserId) {
    const {
      data: { user },
    } = await client.auth.getUser();
    currentUserId = user?.id;
  }
  if (!currentUserId) return null;

  const { data, error } = await client
    .from("specialists")
    .select("*")
    .eq("user_id", currentUserId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapSpecialist(data) : null;
}

export async function getMyPublishedProfile(
  client: SupabaseClient<Database>,
  specialistId?: string,
): Promise<SpecialistPublicProfile | null> {
  let currentSpecialistId = specialistId;
  if (!currentSpecialistId) {
    const specialist = await getMySpecialist(client);
    currentSpecialistId = specialist?.id;
  }
  if (!currentSpecialistId) return null;

  const { data, error } = await client
    .from("specialist_public_profiles")
    .select(publicProfileSelection)
    .eq("specialist_id", currentSpecialistId)
    .eq("publication_status", "published")
    .maybeSingle();

  if (error) throw error;
  return data ? mapPublicProfile(data as PublicProfileQueryRow) : null;
}

export async function getMyDraft(
  client: SupabaseClient<Database>,
  specialistId?: string,
): Promise<SpecialistProfileDraft | null> {
  let currentSpecialistId = specialistId;
  if (!currentSpecialistId) {
    const specialist = await getMySpecialist(client);
    currentSpecialistId = specialist?.id;
  }
  if (!currentSpecialistId) return null;

  const { data, error } = await client
    .from("specialist_profile_drafts")
    .select("*")
    .eq("specialist_id", currentSpecialistId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? mapDraft(data) : null;
}

export async function saveMySpecialistProfileDraft(
  client: SupabaseClient<Database>,
  input: SpecialistProfileDraftInput,
): Promise<string> {
  const draft = specialistProfileDraftInputSchema.parse(input);
  const { data, error } = await client.rpc("save_my_specialist_profile_draft", {
    p_display_name: draft.displayName,
    p_short_bio: draft.shortBio,
    p_long_bio: draft.longBio as unknown as Json,
    p_professional_title: draft.professionalTitle,
    p_languages: draft.languages,
    p_therapy_approaches: draft.therapyApproaches,
    p_specializations: draft.specializations,
    p_education: draft.education,
    p_certificates: draft.certificates,
    p_modalities: draft.modalities,
    ...(draft.profilePhotoUrl
      ? { p_profile_photo_url: draft.profilePhotoUrl }
      : {}),
    ...(draft.portraitPhotoUrl
      ? { p_portrait_photo_url: draft.portraitPhotoUrl }
      : {}),
  });

  if (error) throw error;
  return data;
}

export async function submitProfileForReview(
  client: SupabaseClient<Database>,
  draftId: string,
): Promise<void> {
  const { error } = await client.rpc("submit_my_specialist_profile_draft", {
    p_draft_id: draftId,
  });
  if (error) throw error;
}

export async function listSpecialistsForAdmin(
  client: SupabaseClient<Database>,
): Promise<Specialist[]> {
  const { data, error } = await client
    .from("specialists")
    .select("*")
    .order("created_at");
  if (error) throw error;
  return data.map(mapSpecialist);
}

export async function listSpecialistSummariesForAdmin(
  client: SupabaseClient<Database>,
): Promise<AdminSpecialistSummary[]> {
  const { data, error } = await client
    .from("specialists")
    .select(
      `
        id,
        user_id,
        active,
        accepting_new_clients,
        public_slug,
        professional_title,
        joined_at,
        created_at,
        updated_at,
        profile:profiles!specialists_user_id_fkey (
          id,
          first_name,
          last_name,
          avatar_url,
          active
        ),
        public_profile:specialist_public_profiles (
          display_name,
          profile_photo_url,
          publication_status
        ),
        drafts:specialist_profile_drafts (
          id,
          status,
          submitted_at
        ),
        offers:specialist_services (id)
      `,
    )
    .order("created_at");

  if (error) throw error;
  return (data as unknown as AdminSpecialistSummaryRow[]).map(
    mapAdminSpecialistSummary,
  );
}

export async function getSpecialistByIdAdmin(
  client: SupabaseClient<Database>,
  specialistId: string,
): Promise<Specialist | null> {
  const { data, error } = await client
    .from("specialists")
    .select("*")
    .eq("id", specialistId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapSpecialist(data) : null;
}

export async function getSpecialistPublicProfileAdmin(
  client: SupabaseClient<Database>,
  specialistId: string,
  existingSpecialist?: Specialist,
): Promise<SpecialistPublicProfile | null> {
  const specialist =
    existingSpecialist ?? (await getSpecialistByIdAdmin(client, specialistId));
  if (!specialist) return null;

  const { data, error } = await client
    .from("specialist_public_profiles")
    .select("*")
    .eq("specialist_id", specialistId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    specialistId: data.specialist_id,
    publicSlug: specialist.publicSlug,
    active: specialist.active,
    acceptingNewClients: specialist.acceptingNewClients,
    professionalTitle: specialist.professionalTitle,
    joinedAt: specialist.joinedAt,
    displayName: data.display_name,
    shortBio: data.short_bio,
    longBio: readRichText(data.long_bio),
    profilePhotoUrl: data.profile_photo_url,
    portraitPhotoUrl: data.portrait_photo_url,
    languages: data.languages,
    therapyApproaches: data.therapy_approaches,
    specializations: data.specializations,
    education: data.education,
    certificates: data.certificates,
    modalities: data.modalities,
    publicationStatus: data.publication_status,
    publishedAt: data.published_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function getLatestSpecialistDraftAdmin(
  client: SupabaseClient<Database>,
  specialistId: string,
): Promise<SpecialistProfileDraft | null> {
  const { data, error } = await client
    .from("specialist_profile_drafts")
    .select("*")
    .eq("specialist_id", specialistId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? mapDraft(data) : null;
}

export async function createSpecialistMediaSignedUrl(
  client: SupabaseClient<Database>,
  path: string | null,
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await client.storage
    .from(specialistMediaBucket)
    .createSignedUrl(path, 60 * 30);

  if (error) throw error;
  return data.signedUrl;
}

const specialistImageExtensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;
type SpecialistImageType = keyof typeof specialistImageExtensions;

/** The bucket's own limit (see the specialist domain migration). */
export const SPECIALIST_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const SPECIALIST_IMAGE_TYPES = Object.keys(
  specialistImageExtensions,
) as SpecialistImageType[];

/** A readable reason the file cannot be used, or `null` when it is fine. */
export function validateSpecialistImage(file: {
  type: string;
  size: number;
}): string | null {
  if (!(file.type in specialistImageExtensions)) {
    return "Wybierz plik JPG, PNG lub WebP.";
  }
  if (file.size > SPECIALIST_IMAGE_MAX_BYTES) {
    return "Plik jest za duży. Maksymalny rozmiar to 5 MB.";
  }
  return null;
}

/**
 * A new object path for every upload, so replacing a photo in a draft never
 * overwrites the file the published profile still points to.
 */
export function buildSpecialistMediaPath(
  specialistId: string,
  kind: "profile" | "portrait",
  mimeType: SpecialistImageType,
  uniqueId: string,
): string {
  return `${specialistId}/${kind}-${uniqueId}.${specialistImageExtensions[mimeType]}`;
}

export async function uploadSpecialistProfileImage(
  client: SupabaseClient<Database>,
  {
    specialistId,
    kind,
    file,
  }: { specialistId: string; kind: "profile" | "portrait"; file: File },
): Promise<string> {
  const problem = validateSpecialistImage(file);
  if (problem) throw new Error(problem);

  const path = buildSpecialistMediaPath(
    specialistId,
    kind,
    file.type as SpecialistImageType,
    crypto.randomUUID(),
  );
  const { error } = await client.storage
    .from(specialistMediaBucket)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) throw error;
  return path;
}

export async function listPendingSpecialistDrafts(
  client: SupabaseClient<Database>,
): Promise<SpecialistProfileDraft[]> {
  const { data, error } = await client
    .from("specialist_profile_drafts")
    .select("*")
    .eq("status", "pending_review")
    .order("submitted_at");
  if (error) throw error;
  return data.map(mapDraft);
}

export async function reviewSpecialistProfileDraft(
  client: SupabaseClient<Database>,
  input: unknown,
): Promise<void> {
  const review = specialistProfileReviewInputSchema.parse(input);
  const { error } =
    review.action === "approve"
      ? await client.rpc("approve_specialist_profile_draft", {
          p_draft_id: review.draftId,
          ...(review.comment ? { p_review_comment: review.comment } : {}),
        })
      : await client.rpc("reject_specialist_profile_draft", {
          p_draft_id: review.draftId,
          p_review_comment: review.comment,
        });
  if (error) throw error;
}

export const specialistMappers = {
  adminSummary: mapAdminSpecialistSummary,
  draft: mapDraft,
  publicProfile: mapPublicProfile,
  specialist: mapSpecialist,
};
