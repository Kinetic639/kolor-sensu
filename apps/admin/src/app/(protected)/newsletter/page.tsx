import { NewsletterSubscriberList } from "@/features/newsletter/subscriber-list";
import { requirePortalRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { countNewsletterStatuses } from "@repo/contracts/newsletter";
import { listNewsletterSubscribers } from "@repo/supabase/newsletter";
import { buttonVariants } from "@repo/ui/button";
import { FullBleed } from "@repo/ui/full-bleed";
import { PageTitle } from "@repo/ui/portal-content";
import { Download } from "lucide-react";

// Newsletter (docs/architecture/newsletter-domain.md): who is on the list,
// with how many in each state, and how the newsletter goes out (written
// and sent in Resend, to the addresses this list copies there). The list
// as CSV for moving it elsewhere.

export default async function NewsletterPage() {
  await requirePortalRole();
  const subscribers = await listNewsletterSubscribers(await createClient());
  const counts = countNewsletterStatuses(subscribers);

  return (
    <FullBleed>
      <PageTitle>Newsletter</PageTitle>
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
              Newsletter piszesz i wysyłasz w Resend (Broadcasts), do segmentu
              newslettera: zapisani trafiają tam sami w ciągu kilku minut, a
              wypisy wracają tutaj.
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
