import { createIssueAction } from "@/features/newsletter/issue-actions";
import { NewsletterIssueList } from "@/features/newsletter/issue-list";
import {
  loadIssues,
  loadSubscriberCounts,
} from "@/features/newsletter/loaders";
import { newsletterTabs } from "@/features/newsletter/tabs";
import { requirePortalRole } from "@/lib/auth";
import { Button } from "@repo/ui/button";
import { DetailTabs } from "@repo/ui/detail-page";
import { FullBleed } from "@repo/ui/full-bleed";
import { PageTitle } from "@repo/ui/portal-content";
import { Plus } from "lucide-react";

// Newsletter (docs/architecture/newsletter-domain.md), "Wydania": the
// issues written and sent from here, through Resend, to everyone who
// confirmed. "Nowe wydanie" opens an empty draft. "Adresy" lists who is
// on the list.

export default async function NewsletterIssuesPage() {
  await requirePortalRole();
  const [issues, counts] = await Promise.all([
    loadIssues(),
    loadSubscriberCounts(),
  ]);

  return (
    <FullBleed>
      <PageTitle>Newsletter</PageTitle>
      <DetailTabs
        active="wydania"
        label="Newsletter"
        tabs={newsletterTabs({ issues: issues.length, active: counts.active })}
      />
      <div className="grid gap-3 overflow-y-auto">
        <div className="flex flex-wrap items-start justify-between gap-3 px-3.5 pt-3">
          <p className="max-w-3xl text-sm text-[var(--text-muted)]">
            Wydanie piszesz tutaj: temat, wstęp, karty z artykułami, e-bookami
            albo własne (np. warsztaty). Najpierw wyślij test na swój adres,
            potem wyślij od razu albo zaplanuj godzinę. Pójdzie do wszystkich
            zapisanych ({counts.active}).
          </p>
          <form action={createIssueAction}>
            <Button size="sm" type="submit">
              <Plus aria-hidden="true" className="size-4" />
              Nowe wydanie
            </Button>
          </form>
        </div>
        <NewsletterIssueList issues={issues} />
      </div>
    </FullBleed>
  );
}
