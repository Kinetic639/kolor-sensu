import type { NewsletterIssueRow } from "@repo/contracts/newsletter-issue";
import { Tag } from "@repo/ui/visit-table";
import Link from "next/link";
import { issueTag, issueWhen } from "./issue-view";

// Newsletter → Wydania: every issue, drafts first, then the newest sent,
// as a compact table: the number, the subject (opening the issue), its
// state, when it went (or goes), to how many, and how many stopped the
// newsletter after it.

export function NewsletterIssueList({
  issues,
  now = new Date(),
}: {
  issues: readonly NewsletterIssueRow[];
  now?: Date;
}) {
  const head =
    "h-8 border-b border-[var(--border)] px-3 text-left text-[0.75rem] font-medium text-[var(--text-muted)]";
  const cell = "h-[30px] border-b border-[var(--border)] px-3 text-[0.8125rem]";

  if (issues.length === 0) {
    return (
      <p className="px-3.5 py-6 text-sm text-[var(--text-muted)]">
        Nie ma jeszcze wydań. Zacznij pierwsze: „Nowe wydanie”.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <caption className="sr-only">Wydania newslettera</caption>
        <thead>
          <tr>
            <th className={`${head} w-16`} scope="col">
              Nr
            </th>
            <th className={head} scope="col">
              Temat
            </th>
            <th className={head} scope="col">
              Stan
            </th>
            <th className={`${head} hidden sm:table-cell`} scope="col">
              Wysyłka
            </th>
            <th className={`${head} hidden md:table-cell`} scope="col">
              Odbiorcy
            </th>
            <th className={`${head} hidden lg:table-cell`} scope="col">
              Wypisało się po nim
            </th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue) => {
            const tag = issueTag(issue, now);
            return (
              <tr className="hover:bg-[var(--surface-subtle)]" key={issue.id}>
                <td className={`${cell} text-[var(--text-muted)] tabular-nums`}>
                  {issue.number ?? "—"}
                </td>
                <th className={`${cell} text-left font-medium`} scope="row">
                  <Link
                    className="underline-offset-2 outline-none hover:underline focus-visible:underline"
                    href={`/newsletter/wydania/${issue.id}`}
                  >
                    {issue.subject.trim() || "Wydanie bez tematu"}
                  </Link>
                </th>
                <td className={`${cell} whitespace-nowrap`}>
                  <Tag tone={tag.tone}>{tag.label}</Tag>
                </td>
                <td
                  className={`${cell} hidden whitespace-nowrap text-[var(--text-muted)] sm:table-cell`}
                >
                  {tag.state === "draft" ? "—" : issueWhen(issue.sendAt)}
                </td>
                <td
                  className={`${cell} hidden text-[var(--text-muted)] tabular-nums md:table-cell`}
                >
                  {issue.recipients ?? "—"}
                </td>
                <td
                  className={`${cell} hidden text-[var(--text-muted)] tabular-nums lg:table-cell`}
                >
                  {tag.state === "sent" ? (issue.stoppedAfter ?? 0) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
