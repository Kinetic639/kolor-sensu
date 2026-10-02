import {
  clientGroupSchema,
  emptyRichTextDocument,
  hexColorSchema,
  richTextDocumentSchema,
  specialistProfileDraftInputSchema,
  specialistProfileReviewInputSchema,
  specialistSlugSchema,
  type ClientGroup,
  type Specialist,
  type SpecialistProfileDraft,
  type SpecialistProfileDraftInput,
  type SpecialistPublicProfile,
} from "@repo/contracts";
import type { Database, Json } from "@repo/contracts/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readRichText } from "./rich-text";

type SpecialistRow = Database["public"]["Tables"]["specialists"]["Row"];
type PublicProfileRow =
  Database["public"]["Tables"]["specialist_public_profiles"]["Row"];
type DraftRow =
  Database["public"]["Tables"]["specialist_profile_drafts"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

const specialistMediaBucket = "specialist-profile-media";

/** The database checks the codes; anything else is dropped, not guessed. */
function readClientGroups(values: string[]): ClientGroup[] {
  return values.flatMap((value) => {
    const parsed = clientGroupSchema.safeParse(value);
    return parsed.success ? [parsed.data] : [];
  });
}

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
  color: string | null;
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
    color: row.color,
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
    firstName: row.first_name,
    lastName: row.last_name,
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
    clientGroups: readClientGroups(row.client_groups),
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
    firstName: row.first_name,
    lastName: row.last_name,
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
    clientGroups: readClientGroups(row.client_groups),
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
    color: row.color,
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
  first_name,
  last_name,
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
  client_groups,
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
    p_first_name: draft.firstName,
    p_last_name: draft.lastName,
    p_short_bio: draft.shortBio,
    p_long_bio: draft.longBio as unknown as Json,
    p_professional_title: draft.professionalTitle,
    p_languages: draft.languages,
    p_therapy_approaches: draft.therapyApproaches,
    p_specializations: draft.specializations,
    p_education: draft.education,
    p_certificates: draft.certificates,
    p_modalities: draft.modalities,
    p_client_groups: draft.clientGroups,
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
        color,
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
    firstName: data.first_name,
    lastName: data.last_name,
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
    clientGroups: readClientGroups(data.client_groups),
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

// Signed photo URLs, kept on the server while they are good: every new
// signature is a new address, which the browser loads again (a page that
// re-renders, e.g. a tab of the visit panel, would flash initials).
const PHOTO_URL_SECONDS = 60 * 60;
const PHOTO_URL_REUSE_MS = 15 * 60 * 1000;
const signedPhotos = new Map<string, { url: string; until: number }>();

/** Forgets the kept signatures (for tests). */
export function forgetSignedSpecialistPhotos() {
  signedPhotos.clear();
}

/**
 * Signed URLs for many specialists' photos at once (e.g. a week of a room),
 * by storage path; the same URL again while it has a quarter of an hour
 * left. Missing or failing photos are left out: the page then shows
 * initials instead of failing.
 */
export async function signSpecialistPhotos(
  client: SupabaseClient<Database>,
  paths: (string | null)[],
): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter((path): path is string => !!path))];
  const urls = new Map<string, string>();
  const now = Date.now();
  const toSign: string[] = [];
  for (const path of unique) {
    const kept = signedPhotos.get(path);
    if (kept && kept.until - now > PHOTO_URL_REUSE_MS) urls.set(path, kept.url);
    else toSign.push(path);
  }
  if (!toSign.length) return urls;

  const { data, error } = await client.storage
    .from(specialistMediaBucket)
    .createSignedUrls(toSign, PHOTO_URL_SECONDS);
  if (error) {
    console.error("[specialists] photos not signed:", error);
    return urls;
  }
  for (const one of data) {
    if (one.path && one.signedUrl && !one.error) {
      urls.set(one.path, one.signedUrl);
      signedPhotos.set(one.path, {
        url: one.signedUrl,
        until: now + PHOTO_URL_SECONDS * 1000,
      });
    }
  }
  return urls;
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

/** Gives a specialist a new public address (admins only); the old one redirects. */
export async function setSpecialistPublicSlugAdmin(
  client: SupabaseClient<Database>,
  specialistId: string,
  slug: string,
): Promise<string> {
  const publicSlug = specialistSlugSchema.parse(slug.trim().toLowerCase());
  const { data, error } = await client.rpc("set_specialist_public_slug", {
    p_specialist_id: specialistId,
    p_public_slug: publicSlug,
  });

  if (error) throw error;
  return data;
}

/** Sets a specialist's colour (admins only); null for the automatic one. */
export async function setSpecialistColorAdmin(
  client: SupabaseClient<Database>,
  specialistId: string,
  color: string | null,
): Promise<string | null> {
  const value = color === null ? null : hexColorSchema.parse(color);
  const { data, error } = await client.rpc("set_specialist_color", {
    p_specialist_id: specialistId,
    p_color: value,
  });

  if (error) throw error;
  return data;
}

/** The current slug of a published specialist who used to have `slug`. */
export async function getSpecialistSlugRedirect(
  client: SupabaseClient<Database>,
  slug: string,
): Promise<string | null> {
  const parsed = specialistSlugSchema.safeParse(slug);
  if (!parsed.success) return null;

  const { data, error } = await client
    .from("specialist_slug_redirects")
    .select("specialist:specialists!inner (public_slug)")
    .eq("old_slug", parsed.data)
    .maybeSingle();

  if (error) throw error;
  return (
    (data as { specialist: { public_slug: string } } | null)?.specialist
      .public_slug ?? null
  );
}

/**
 * Which picture the portal header shows: the account avatar if set, otherwise
 * the specialist photo last saved in "Mój profil" (a draft counts, it is the
 * specialist's own portal), otherwise the published one.
 */
export function pickPortalAvatarPath({
  accountAvatarUrl,
  draftPhotoPath,
  publishedPhotoPath,
}: {
  accountAvatarUrl: string | null;
  draftPhotoPath: string | null;
  publishedPhotoPath: string | null;
}): { url: string } | { storagePath: string } | null {
  if (accountAvatarUrl) return { url: accountAvatarUrl };
  const storagePath = draftPhotoPath ?? publishedPhotoPath;
  return storagePath ? { storagePath } : null;
}

/** The header picture URL for a signed-in user; never throws. */
export async function getPortalAvatarUrl(
  client: SupabaseClient<Database>,
  {
    userId,
    accountAvatarUrl,
  }: { userId: string; accountAvatarUrl: string | null },
): Promise<string | null> {
  if (accountAvatarUrl) return accountAvatarUrl;
  try {
    const specialist = await getMySpecialist(client, userId);
    if (!specialist) return null;
    const [draft, published] = await Promise.all([
      getMyDraft(client, specialist.id),
      getMyPublishedProfile(client, specialist.id),
    ]);
    const choice = pickPortalAvatarPath({
      accountAvatarUrl,
      draftPhotoPath: draft?.profilePhotoUrl ?? null,
      publishedPhotoPath: published?.profilePhotoUrl ?? null,
    });
    if (!choice) return null;
    return "url" in choice
      ? choice.url
      : await createSpecialistMediaSignedUrl(client, choice.storagePath);
  } catch (error) {
    console.error("[specialists] portal avatar failed:", error);
    return null;
  }
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
