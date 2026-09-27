import { ArrowLink, SoftCard } from "@repo/ui/public-site";
import type { ReactNode } from "react";
import { PageIntro } from "@/components/page-intro";

// A legal document's page. The documents themselves are supplied by the
// centre; until then the page says so plainly instead of making them up.

export function LegalPage({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <>
      <PageIntro trail={[{ label: title }]} heading={title} />
      <section className="max-w-page px-gutter pb-section-sm mx-auto">
        <SoftCard className="text-body text-ink grid max-w-3xl gap-4 p-6 lg:p-8">
          {children ?? (
            <p>
              Pełna treść tego dokumentu jest w przygotowaniu i zostanie
              opublikowana wkrótce. Jeśli masz pytania, skontaktuj się z nami.
            </p>
          )}
          <ArrowLink href="/kontakt" className="justify-self-start">
            Kontakt
          </ArrowLink>
        </SoftCard>
      </section>
    </>
  );
}
