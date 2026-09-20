import {
  specialistProfileDraftInputSchema,
  specialistProfileReviewInputSchema,
  specialistSlugSchema,
  type Specialist,
  type SpecialistProfileDraft,
  type SpecialistProfileDraftInput,
  type SpecialistPublicProfile,
} from "@repo/contracts";
import type { Database } from "@repo/contracts/database";
import type { SupabaseClient } from "@supabase/supabase-js";

type SpecialistRow = Database["public"]["Tables"]["specialists"]["Row"];
type PublicProfileRow =
  Database["public"]["Tables"]["specialist_public_profiles"]["Row"];
type DraftRow =
  Database["public"]["Tables"]["specialist_profile_drafts"]["Row"];

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
    longBio: row.long_bio,
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
    shortBio: row.short_bio,
    longBio: row.long_bio,
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
    p_long_bio: draft.longBio,
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
  draft: mapDraft,
  publicProfile: mapPublicProfile,
  specialist: mapSpecialist,
};
