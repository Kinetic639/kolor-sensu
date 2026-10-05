import "server-only";

import { requirePortalRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// CMS → E-maile: every e-mail a client gets, built by the site (which
// sends them) from a sample visit, with this admin's access token.

export interface EmailPreview {
  key: string;
  group: string;
  name: string;
  when: string;
  attachment: string | null;
  subject: string;
  preview: string;
  html: string;
  text: string;
}

export async function loadEmailPreviews(): Promise<EmailPreview[] | null> {
  await requirePortalRole();
  const client = await createClient();
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session) return null;
  try {
    const response = await fetch(
      new URL(
        "/api/centrum/maile",
        process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000",
      ),
      {
        headers: { authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      },
    );
    if (!response.ok) return null;
    const answer = (await response.json()) as { emails: EmailPreview[] };
    return answer.emails;
  } catch (error) {
    console.error("[emails] the previews failed:", error);
    return null;
  }
}
