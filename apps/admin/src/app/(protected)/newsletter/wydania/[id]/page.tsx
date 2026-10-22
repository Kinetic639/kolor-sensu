import { IssueWorkspace } from "@/features/newsletter/issue-workspace";
import {
  loadIssue,
  loadIssues,
  loadIssueSources,
  loadSubscriberCounts,
} from "@/features/newsletter/loaders";
import { requirePortalRole } from "@/lib/auth";
import { FullBleed } from "@repo/ui/full-bleed";
import { notFound } from "next/navigation";

// One issue of the newsletter: written, previewed, tested and sent from
// the bar (the workspace); a sent one shows how it went.

export default async function NewsletterIssuePage({
  params,
}: PageProps<"/newsletter/wydania/[id]">) {
  await requirePortalRole();
  const { id } = await params;
  const [issue, rows, sources, counts] = await Promise.all([
    loadIssue(id),
    loadIssues(),
    loadIssueSources(),
    loadSubscriberCounts(),
  ]);
  if (!issue) notFound();
  const row = rows.find((one) => one.id === id);

  return (
    <FullBleed>
      <IssueWorkspace
        articles={sources.articles}
        ebooks={sources.ebooks}
        id={id}
        initial={{
          subject: issue.subject,
          previewText: issue.previewText,
          intro: issue.intro,
          items: issue.items,
          closing: issue.closing,
          inArchive: issue.inArchive,
        }}
        key={issue.updatedAt}
        number={issue.number}
        recipients={issue.recipients}
        sendAt={issue.sendAt}
        siteUrl={process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000"}
        status={issue.status}
        stoppedAfter={row?.stoppedAfter ?? null}
        subscribers={counts.active}
      />
    </FullBleed>
  );
}
