"use server";

import { requirePortalRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/use-save";
import { fetchNaffyPrice, naffyPriceView } from "@repo/app-runtime/naffy-price";
import { revalidateWeb } from "@repo/app-runtime/revalidate-web";
import {
  articleCategoryInputSchema,
  articleDraftSchema,
  ebookDraftSchema,
  emptyArticleDraft,
  emptyEbookDraft,
  publishProblem,
  type ArticleCategoryInput,
  type ArticleDraft,
  type EbookDraft,
} from "@repo/contracts/education";
import {
  createArticle,
  createArticleCategory,
  createEbook,
  deleteArticle,
  deleteArticleCategory,
  deleteEbook,
  publishArticle,
  publishEbook,
  saveArticleDraft,
  saveEbookDraft,
  unpublishArticle,
  unpublishEbook,
  updateArticleCategory,
} from "@repo/supabase/education";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Edukacja's saves in the portal: drafts, publishing, withdrawing and
// deleting articles and e-books, and the categories. The database checks
// the admin role and what publishing needs; its refusals are said in
// Polish (PUBLISH_PROBLEMS). After a publication the site refreshes
// Edukacja (its pages come in the next step of the plan).

function failure(error: unknown, fallback: string): ActionResult {
  if (typeof error === "object" && error) {
    if ("code" in error && error.code === "42501")
      return { ok: false, message: "Brak uprawnień do tej zmiany." };
    if ("code" in error && error.code === "23505")
      return { ok: false, message: "Ten adres albo ta nazwa są już zajęte." };
    if ("message" in error && typeof error.message === "string") {
      const problem = publishProblem(error.message);
      if (problem) return { ok: false, message: problem };
    }
  }
  console.error("[education]", error);
  return { ok: false, message: fallback };
}

async function refreshSite() {
  // Everything under Edukacja, the profiles and services that list
  // articles, and the sitemap: the layout covers them all.
  await revalidateWeb([{ path: "/", type: "layout" }]);
}

// ------------------------------------------------------------ articles

export async function createArticleAction() {
  await requirePortalRole();
  const id = await createArticle(
    await createClient(),
    emptyArticleDraft(`nowy-artykul-${Date.now().toString(36)}`),
  );
  revalidatePath("/artykuly");
  redirect(`/artykuly/${id}`);
}

export async function saveArticleDraftAction(
  id: string,
  draft: ArticleDraft,
): Promise<ActionResult> {
  await requirePortalRole();
  const parsed = articleDraftSchema.safeParse(draft);
  if (!parsed.success) {
    const imageText = parsed.error.issues.some((issue) =>
      issue.message.includes("niewidomych"),
    );
    return {
      ok: false,
      message: imageText
        ? "Opisz wszystkie zdjęcia dla osób niewidomych."
        : (parsed.error.issues[0]?.message ?? "Sprawdź zaznaczone pola."),
    };
  }
  try {
    await saveArticleDraft(await createClient(), id, parsed.data);
    revalidatePath("/artykuly");
    return { ok: true };
  } catch (error) {
    return failure(error, "Nie udało się zapisać szkicu.");
  }
}

export async function publishArticleAction(id: string): Promise<ActionResult> {
  await requirePortalRole();
  try {
    await publishArticle(await createClient(), id);
    revalidatePath("/artykuly");
    await refreshSite();
    return { ok: true };
  } catch (error) {
    return failure(error, "Publikacja się nie powiodła.");
  }
}

export async function unpublishArticleAction(
  id: string,
): Promise<ActionResult> {
  await requirePortalRole();
  try {
    await unpublishArticle(await createClient(), id);
    revalidatePath("/artykuly");
    await refreshSite();
    return { ok: true };
  } catch (error) {
    return failure(error, "Nie udało się wycofać artykułu.");
  }
}

export async function deleteArticleAction(id: string): Promise<ActionResult> {
  await requirePortalRole();
  try {
    await deleteArticle(await createClient(), id);
  } catch (error) {
    return failure(error, "Nie udało się usunąć artykułu.");
  }
  revalidatePath("/artykuly");
  redirect("/artykuly");
}

// ------------------------------------------------------------ categories

export async function saveCategoryAction(
  id: string | null,
  input: ArticleCategoryInput,
): Promise<ActionResult> {
  await requirePortalRole();
  const parsed = articleCategoryInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Sprawdź pola.",
    };
  try {
    const client = await createClient();
    if (id) await updateArticleCategory(client, id, parsed.data);
    else await createArticleCategory(client, parsed.data);
    revalidatePath("/artykuly", "layout");
    await refreshSite();
    return { ok: true };
  } catch (error) {
    return failure(error, "Nie udało się zapisać kategorii.");
  }
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  await requirePortalRole();
  try {
    await deleteArticleCategory(await createClient(), id);
    revalidatePath("/artykuly", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error, "Nie udało się usunąć kategorii.");
  }
}

// ------------------------------------------------------------ e-books

export async function createEbookAction() {
  await requirePortalRole();
  const id = await createEbook(
    await createClient(),
    emptyEbookDraft(`nowy-ebook-${Date.now().toString(36)}`),
  );
  revalidatePath("/ebooki");
  redirect(`/ebooki/${id}`);
}

export async function saveEbookDraftAction(
  id: string,
  draft: EbookDraft,
): Promise<ActionResult> {
  await requirePortalRole();
  const parsed = ebookDraftSchema.safeParse(draft);
  if (!parsed.success)
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Sprawdź zaznaczone pola.",
    };
  try {
    await saveEbookDraft(await createClient(), id, parsed.data);
    revalidatePath("/ebooki");
    return { ok: true };
  } catch (error) {
    return failure(error, "Nie udało się zapisać szkicu.");
  }
}

export async function publishEbookAction(id: string): Promise<ActionResult> {
  await requirePortalRole();
  try {
    await publishEbook(await createClient(), id);
    revalidatePath("/ebooki");
    await refreshSite();
    return { ok: true };
  } catch (error) {
    return failure(error, "Publikacja się nie powiodła.");
  }
}

export async function unpublishEbookAction(id: string): Promise<ActionResult> {
  await requirePortalRole();
  try {
    await unpublishEbook(await createClient(), id);
    revalidatePath("/ebooki");
    await refreshSite();
    return { ok: true };
  } catch (error) {
    return failure(error, "Nie udało się wycofać e-booka.");
  }
}

export async function deleteEbookAction(id: string): Promise<ActionResult> {
  await requirePortalRole();
  try {
    await deleteEbook(await createClient(), id);
  } catch (error) {
    return failure(error, "Nie udało się usunąć e-booka.");
  }
  revalidatePath("/ebooki");
  redirect("/ebooki");
}

// ------------------------------------------------------------ Naffy

export type NaffyPriceCheck =
  | { ok: true; current: string; regular: string | null; lowest: string | null }
  | { ok: false };

/** The price visitors would see now, read from the product's Naffy page. */
export async function checkNaffyPriceAction(
  naffyUrl: string,
): Promise<NaffyPriceCheck> {
  await requirePortalRole();
  const price = await fetchNaffyPrice(naffyUrl, { cache: "no-store" });
  if (!price) return { ok: false };
  const { current, regular, lowest } = naffyPriceView(price);
  return { ok: true, current, regular, lowest };
}
