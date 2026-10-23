import type { LegalPageKey } from "@repo/contracts/cms-legal";
import { ArrowLink, SoftCard } from "@repo/ui/public-site";
import { RichTextRenderer } from "@repo/ui/rich-text-renderer";
import { PageIntro } from "@/components/page-intro";
import { getLegalPage } from "@/lib/public-data";

// A legal document's page (Regulamin, Polityka prywatności, Pliki cookies):
// the CMS's header, the date it applies from and the document itself as
// rich text, its headings under the page's h1; then a way to ask.

export async function LegalPage({ page }: { page: LegalPageKey }) {
  const { intro, body, effectiveFrom } = await getLegalPage(page);
  return (
    <>
      <PageIntro header={intro}>
        {effectiveFrom ? (
          <p className="text-small text-text-muted">
            Obowiązuje od: {effectiveFrom}
          </p>
        ) : null}
      </PageIntro>
      <section className="max-w-page px-gutter pb-section-sm mx-auto">
        <SoftCard className="grid max-w-3xl gap-6 p-6 lg:p-10">
          <RichTextRenderer
            className="text-body text-ink max-w-copy [&_a]:text-primary-strong [&_blockquote]:border-primary [&_blockquote]:text-text-muted [&_h2]:font-display [&_h2]:text-h3 [&_h3]:font-display [&_h3]:text-title [&>:first-child]:mt-0 [&>:last-child]:mb-0"
            document={body}
          />
          <ArrowLink href="/kontakt" className="justify-self-start">
            Pytania? Napisz do nas
          </ArrowLink>
        </SoftCard>
      </section>
    </>
  );
}
