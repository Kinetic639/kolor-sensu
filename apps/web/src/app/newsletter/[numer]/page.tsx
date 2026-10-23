import { isRichTextEmpty } from "@repo/contracts/rich-text";
import { ArrowLink } from "@repo/ui/public-site/actions";
import { NewsletterIssueCards } from "@repo/ui/public-site";
import { RichTextRenderer } from "@repo/ui/rich-text-renderer";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageIntro } from "@/components/page-intro";
import { issueDate, issueNumber } from "@/features/newsletter/archive-view";
import { newsletterCards } from "@/features/newsletter/issue-items";
import { NewsletterSection } from "@/features/newsletter/newsletter-section";
import { articleImageUrl, getArticles, getEbooks } from "@/lib/education-data";
import { getNewsletterArchiveIssue } from "@/lib/newsletter-data";

// One issue in the archive, as it went out: the introduction, the cards
// (the articles and e-books as they are published now; one withdrawn
// since is left out) and the closing word, then the sign-up. An issue not
// in the archive (not sent yet, or kept out of it) is not found.

export const revalidate = 300;

async function issueFor(numer: string) {
  const number = issueNumber(numer);
  return number ? getNewsletterArchiveIssue(number) : null;
}

export async function generateMetadata({
  params,
}: PageProps<"/newsletter/[numer]">): Promise<Metadata> {
  const issue = await issueFor((await params).numer);
  if (!issue) return { title: "Nie znaleziono wydania" };
  return {
    title: `${issue.subject} · Newsletter nr ${issue.number}`,
    description: issue.previewText || undefined,
    alternates: { canonical: `/newsletter/${issue.number}` },
  };
}

export default async function NewsletterIssuePage({
  params,
}: PageProps<"/newsletter/[numer]">) {
  const issue = await issueFor((await params).numer);
  if (!issue) notFound();
  const [articles, ebooks] = await Promise.all([getArticles(), getEbooks()]);
  const cards = newsletterCards(issue.items, {
    articles,
    ebooks,
    imageUrl: articleImageUrl,
    origin: "",
  });

  return (
    <>
      <PageIntro
        eyebrow={`Newsletter nr ${issue.number} · ${issueDate(issue.sendAt)}`}
        heading={issue.subject}
        lead={issue.previewText || undefined}
      />
      <div className="max-w-page px-gutter mx-auto grid w-full max-w-[46rem] gap-10 pb-6">
        {isRichTextEmpty(issue.intro) ? null : (
          <RichTextRenderer document={issue.intro} />
        )}
        <NewsletterIssueCards cards={cards} />
        {isRichTextEmpty(issue.closing) ? null : (
          <RichTextRenderer document={issue.closing} />
        )}
        <ArrowLink href="/newsletter">Wszystkie wydania</ArrowLink>
      </div>
      <NewsletterSection source="archive" />
    </>
  );
}
