import type { NewsletterArchiveIssue } from "@repo/contracts/newsletter-issue";
import { listNewsletterArchive } from "@repo/supabase/newsletter";
import { cache } from "react";
import { load } from "./public-data";

// The newsletter's archive for the site: the issues gone out and kept in
// it (the database's rule), never throwing (see public-data.ts).

export const getNewsletterArchive = cache(
  (): Promise<NewsletterArchiveIssue[]> =>
    load("newsletter archive", listNewsletterArchive, []),
);

export const getNewsletterArchiveIssue = cache(async (number: number) => {
  const issues = await getNewsletterArchive();
  return issues.find((issue) => issue.number === number) ?? null;
});
