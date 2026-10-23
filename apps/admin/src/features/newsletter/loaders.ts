import "server-only";

import { loadArticles, loadEbooks } from "@/features/education/loaders";
import { createClient } from "@/lib/supabase/server";
import { countNewsletterStatuses } from "@repo/contracts/newsletter";
import {
  getNewsletterIssue,
  listNewsletterIssues,
  listNewsletterSubscribers,
} from "@repo/supabase/newsletter";
import { cache } from "react";

// Newsletter's data for the portal's pages (the database checks the admin
// role in each function it calls).

export const loadIssues = cache(async () =>
  listNewsletterIssues(await createClient()),
);

export const loadIssue = cache(async (id: string) =>
  getNewsletterIssue(await createClient(), id).catch(() => null),
);

export const loadSubscribers = cache(async () =>
  listNewsletterSubscribers(await createClient()),
);

export async function loadSubscriberCounts() {
  return countNewsletterStatuses(await loadSubscribers());
}

/** Published articles and e-books, as the editor's cards can name them. */
export async function loadIssueSources() {
  const [articles, ebooks] = await Promise.all([loadArticles(), loadEbooks()]);
  const published = <T extends { status: string }>(rows: T[]) =>
    rows.filter((row) => row.status === "published");
  return {
    articles: published(articles).map((row) => ({
      id: row.id,
      title: row.draft.title.trim() || "Bez tytułu",
    })),
    ebooks: published(ebooks).map((row) => ({
      id: row.id,
      title: row.draft.title.trim() || "Bez tytułu",
    })),
  };
}

/** A title for the header's trail. */
export async function issueTitle(id: string): Promise<string | null> {
  const issue = await loadIssue(id);
  if (!issue) return null;
  const subject = issue.subject.trim() || "Wydanie bez tematu";
  return issue.number ? `Nr ${issue.number}: ${subject}` : subject;
}
