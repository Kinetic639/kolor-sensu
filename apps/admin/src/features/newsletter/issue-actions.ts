"use server";

import { requirePortalRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/use-save";
import {
  NEWSLETTER_SEND_PROBLEMS,
  newsletterIssueDraftSchema,
  type NewsletterIssueDraft,
  type NewsletterIssueRequest,
} from "@repo/contracts/newsletter-issue";
import {
  createNewsletterIssue,
  deleteNewsletterIssue,
  saveNewsletterIssue,
  setNewsletterIssueArchive,
} from "@repo/supabase/newsletter";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Newsletter → Wydania's actions. Writing a draft goes to the database
// (which checks the admin role again); the preview, the test and sending
// go to the site's server, which renders the issue and talks to Resend, as
// this admin (their token goes with the request).

const LIST = "/newsletter";
const issuePath = (id: string) => `/newsletter/wydania/${id}`;

function problem(error: unknown, fallback: string): ActionResult {
  if (typeof error === "object" && error && "code" in error) {
    if (error.code === "42501")
      return { ok: false, message: "Brak uprawnień do tej zmiany." };
    if (error.code === "P0002")
      return { ok: false, message: "Tego wydania już nie ma." };
  }
  const message =
    typeof error === "object" && error && "message" in error
      ? String(error.message)
      : "";
  const known = NEWSLETTER_SEND_PROBLEMS[message];
  if (known) return { ok: false, message: known };
  console.error("[newsletter]", error);
  return { ok: false, message: fallback };
}

export async function createIssueAction(): Promise<never> {
  await requirePortalRole();
  const id = await createNewsletterIssue(await createClient());
  revalidatePath(LIST);
  redirect(`/newsletter/wydania/${id}`);
}

export async function saveIssueAction(
  id: string,
  draft: NewsletterIssueDraft,
): Promise<ActionResult> {
  await requirePortalRole();
  const parsed = newsletterIssueDraftSchema.safeParse(draft);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Sprawdź pola wydania.",
    };
  }
  try {
    await saveNewsletterIssue(await createClient(), id, parsed.data);
    revalidatePath(LIST);
    return { ok: true };
  } catch (error) {
    return problem(error, "Nie udało się zapisać wydania.");
  }
}

export async function deleteIssueAction(id: string): Promise<ActionResult> {
  await requirePortalRole();
  try {
    await deleteNewsletterIssue(await createClient(), id);
  } catch (error) {
    return problem(error, "Nie udało się usunąć wydania.");
  }
  revalidatePath(LIST);
  redirect("/newsletter");
}

export async function setIssueArchiveAction(
  id: string,
  inArchive: boolean,
): Promise<ActionResult> {
  await requirePortalRole();
  try {
    await setNewsletterIssueArchive(await createClient(), id, inArchive);
    revalidatePath(LIST);
    revalidatePath(issuePath(id));
    return { ok: true };
  } catch (error) {
    return problem(error, "Nie udało się zmienić archiwum.");
  }
}

// ------------------------------------------------------------ the site

type SiteAnswer<T> = { ok: true; value: T } | { ok: false; message: string };

async function askSite<T>(
  body: NewsletterIssueRequest,
): Promise<SiteAnswer<T>> {
  await requirePortalRole();
  const client = await createClient();
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session) return { ok: false, message: "Zaloguj się ponownie." };
  try {
    const response = await fetch(
      new URL(
        "/api/centrum/newsletter",
        process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000",
      ),
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${session.access_token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
      },
    );
    const answer = (await response.json().catch(() => null)) as
      (T & { ok?: boolean; message?: string }) | null;
    if (!answer) {
      return {
        ok: false,
        message: "Strona nie odpowiedziała. Spróbuj ponownie za chwilę.",
      };
    }
    if (answer.ok === false || !response.ok) {
      return {
        ok: false,
        message: answer.message ?? "Coś poszło nie tak. Spróbuj ponownie.",
      };
    }
    return { ok: true, value: answer };
  } catch (error) {
    console.error(`[newsletter] the site's ${body.action} failed:`, error);
    return {
      ok: false,
      message:
        "Nie udało się połączyć ze stroną. Sprawdź, czy działa, i spróbuj ponownie.",
    };
  }
}

export interface IssuePreview {
  subject: string;
  preview: string;
  html: string;
  text: string;
}

export async function previewIssueAction(
  draft: NewsletterIssueDraft,
): Promise<SiteAnswer<IssuePreview>> {
  return askSite<IssuePreview>({ action: "preview", draft });
}

export async function testIssueAction(
  draft: NewsletterIssueDraft,
): Promise<ActionResult & { to?: string }> {
  const answer = await askSite<{ to: string }>({ action: "test", draft });
  return answer.ok ? { ok: true, to: answer.value.to } : answer;
}

/** Saves the draft, then sends it now (null) or at the time given. */
export async function sendIssueAction(
  id: string,
  draft: NewsletterIssueDraft,
  sendAt: string | null,
): Promise<ActionResult> {
  const saved = await saveIssueAction(id, draft);
  if (!saved.ok) return saved;
  const answer = await askSite<{ number: number }>({
    action: "send",
    id,
    sendAt,
  });
  revalidatePath(LIST);
  revalidatePath(issuePath(id));
  return answer.ok ? { ok: true } : answer;
}

export async function cancelIssueAction(id: string): Promise<ActionResult> {
  const answer = await askSite<unknown>({ action: "cancel", id });
  revalidatePath(LIST);
  revalidatePath(issuePath(id));
  return answer.ok ? { ok: true } : answer;
}
