import { NewsletterArchiveList } from "@repo/ui/public-site";
import type { Metadata } from "next";
import { PageIntro } from "@/components/page-intro";
import { archiveEntry } from "@/features/newsletter/archive-view";
import { NewsletterSection } from "@/features/newsletter/newsletter-section";
import { getNewsletterArchive } from "@/lib/newsletter-data";

// The newsletter's archive: every issue gone out and kept in it, newest
// first, then the sign-up. Refreshed every few minutes (a scheduled issue
// appears once it goes) and when the portal sends one.

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Newsletter: archiwum wydań",
  description:
    "Poprzednie wydania newslettera Kolor Sensu: artykuły, warsztaty i nowości z centrum.",
  alternates: { canonical: "/newsletter" },
};

export default async function NewsletterArchivePage() {
  const issues = await getNewsletterArchive();
  return (
    <>
      <PageIntro
        eyebrow="Newsletter"
        heading="Archiwum wydań"
        accent="Raz w miesiącu."
        lead="Artykuły, warsztaty i nowości z centrum, które wysłaliśmy osobom zapisanym na newsletter."
      />
      <section className="max-w-page px-gutter mx-auto w-full max-w-[46rem]">
        <NewsletterArchiveList
          empty="Pierwszy newsletter jeszcze przed nami. Zapisz się poniżej, a przyjdzie prosto do Ciebie."
          issues={issues.map(archiveEntry)}
        />
      </section>
      <NewsletterSection source="archive" />
    </>
  );
}
