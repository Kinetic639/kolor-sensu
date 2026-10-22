import { loadIssues, loadSubscribers } from "@/features/newsletter/loaders";
import { NewsletterSubscriberList } from "@/features/newsletter/subscriber-list";
import { newsletterTabs } from "@/features/newsletter/tabs";
import { requirePortalRole } from "@/lib/auth";
import { countNewsletterStatuses } from "@repo/contracts/newsletter";
import { buttonVariants } from "@repo/ui/button";
import { DetailTabs } from "@repo/ui/detail-page";
import { FullBleed } from "@repo/ui/full-bleed";
import { PageTitle } from "@repo/ui/portal-content";
import { Download } from "lucide-react";

// Newsletter → Adresy: who is on the list, with how many in each state.
// The list as CSV for moving it elsewhere.

export default async function NewsletterAddressesPage() {
  await requirePortalRole();
  const [subscribers, issues] = await Promise.all([
    loadSubscribers(),
    loadIssues(),
  ]);
  const counts = countNewsletterStatuses(subscribers);

  return (
    <FullBleed>
      <PageTitle>Newsletter</PageTitle>
      <DetailTabs
        active="adresy"
        label="Newsletter"
        tabs={newsletterTabs({ issues: issues.length, active: counts.active })}
      />
      <div className="grid gap-3 overflow-y-auto">
        <div className="flex flex-wrap items-start justify-between gap-3 px-3.5 pt-3">
          <div className="grid max-w-3xl gap-1 text-sm text-[var(--text-muted)]">
            <p>
              <strong className="text-[var(--text)]">
                Zapisanych: {counts.active}
              </strong>
              {" · "}czeka na potwierdzenie: {counts.pending}
              {" · "}wypisanych: {counts.unsubscribed}
            </p>
            <p>
              Adres trafia na listę dopiero po kliknięciu w link z e-maila.
              Zapisani trafiają do Resend sami w ciągu kilku minut, a wypisy
              wracają tutaj. Wydania wysyłasz w zakładce „Wydania”.
            </p>
          </div>
          <a
            className={buttonVariants({ size: "sm", variant: "outline" })}
            download
            href="/newsletter/eksport"
          >
            <Download aria-hidden="true" className="size-4" />
            Pobierz CSV
          </a>
        </div>
        <NewsletterSubscriberList subscribers={subscribers} />
      </div>
    </FullBleed>
  );
}
