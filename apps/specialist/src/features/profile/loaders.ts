import "server-only";

import { requirePortalRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  createSpecialistMediaSignedUrl,
  getMyDraft,
  getMyPublishedProfile,
  getMySpecialist,
} from "@repo/supabase";
import { mapProfileEditorViewModel } from "./view-model";

export async function loadProfileEditor() {
  const [authorization, client] = await Promise.all([
    requirePortalRole(),
    createClient(),
  ]);
  const specialist = await getMySpecialist(client, authorization.user.id);
  if (!specialist) return null;

  const [published, draft] = await Promise.all([
    getMyPublishedProfile(client, specialist.id),
    getMyDraft(client, specialist.id),
  ]);
  const model = mapProfileEditorViewModel({
    specialist,
    published,
    draft,
    fallbackName: [
      authorization.profile.first_name,
      authorization.profile.last_name,
    ]
      .filter(Boolean)
      .join(" "),
    media: { profilePhotoUrl: null, portraitPhotoUrl: null },
    webUrl: process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000",
  });

  const [profilePhotoUrl, portraitPhotoUrl] = await Promise.all([
    createSpecialistMediaSignedUrl(client, model.values.profilePhotoUrl),
    createSpecialistMediaSignedUrl(client, model.values.portraitPhotoUrl),
  ]);
  return { ...model, photoPreviews: { profilePhotoUrl, portraitPhotoUrl } };
}
