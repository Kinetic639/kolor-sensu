"use server";

import { requirePortalRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/use-save";
import {
  getNewsletterConsent,
  removeNewsletterSubscriber,
  type NewsletterConsent,
} from "@repo/supabase/newsletter";
import { revalidatePath } from "next/cache";

// Newsletter's actions: the consent an address gave (for a request to see
// one's data) and removing an address (a request to delete it). The
// database checks the admin role again; an address Resend may know is
// deleted there by the site's next sync (within 10 minutes).

export async function newsletterConsentAction(
  id: string,
): Promise<NewsletterConsent | null> {
  await requirePortalRole();
  try {
    return await getNewsletterConsent(await createClient(), id);
  } catch (error) {
    console.error("[newsletter]", error);
    return null;
  }
}

export async function removeNewsletterSubscriberAction(
  id: string,
): Promise<ActionResult> {
  await requirePortalRole();
  try {
    await removeNewsletterSubscriber(await createClient(), id);
    revalidatePath("/newsletter");
    return { ok: true };
  } catch (error) {
    if (typeof error === "object" && error && "code" in error) {
      if (error.code === "42501")
        return { ok: false, message: "Brak uprawnień do tej zmiany." };
      if (error.code === "P0002")
        return { ok: false, message: "Tego adresu już nie ma na liście." };
    }
    console.error("[newsletter]", error);
    return { ok: false, message: "Nie udało się usunąć adresu." };
  }
}
