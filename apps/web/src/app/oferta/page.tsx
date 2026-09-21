import { createPublicClient } from "@/lib/supabase/public";
import {
  buildPublicOfferSummary,
  formatPriceMinor,
  formatSpecialistCountLabel,
} from "@repo/contracts";
import { listPublicServices, listPublicSpecialistOffers } from "@repo/supabase";
import { Badge } from "@repo/ui/badge";
import { Card } from "@repo/ui/card";
import { Container } from "@repo/ui/container";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Oferta | Kolor Sensu",
  description: "Usługi dostępne w Kolor Sensu — Centrum Psychoterapii.",
};

export default async function OfertaPage() {
  const client = createPublicClient();
  // One services query + one all-services offers query -- avoids an
  // N+1 query per service on this list page.
  const [services, offers] = await Promise.all([
    listPublicServices(client),
    listPublicSpecialistOffers(client),
  ]);
  const summaries = services.map((service) =>
    buildPublicOfferSummary(service, offers),
  );

  return (
    <div className="py-10">
      <Container>
        <h1 className="font-heading mb-6 text-3xl font-semibold text-[var(--text)] sm:text-4xl">
          Oferta
        </h1>
        {summaries.length === 0 ? (
          <p className="text-[var(--text-muted)]">
            Oferta jest obecnie aktualizowana.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {summaries.map((summary) => (
              <li key={summary.id}>
                <Card className="space-y-3 p-5">
                  <div>
                    <h2 className="font-heading text-lg font-semibold text-[var(--text)]">
                      {summary.name}
                    </h2>
                    {summary.shortDescription ? (
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        {summary.shortDescription}
                      </p>
                    ) : null}
                  </div>
                  <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <div className="flex gap-1">
                      <dt className="font-medium text-[var(--text)]">
                        Czas trwania:
                      </dt>
                      <dd className="text-[var(--text-muted)]">
                        {summary.defaultDurationMinutes} min
                      </dd>
                    </div>
                    <div className="flex gap-1">
                      <dt className="font-medium text-[var(--text)]">Cena:</dt>
                      <dd className="text-[var(--text-muted)]">
                        {summary.minPriceMinor !== null &&
                        summary.minPriceCurrencyCode
                          ? `od ${formatPriceMinor(summary.minPriceMinor, summary.minPriceCurrencyCode)}`
                          : "Cena ustalana indywidualnie"}
                      </dd>
                    </div>
                  </dl>
                  <div className="flex flex-wrap items-center gap-2">
                    {summary.supportsOnline ? (
                      <Badge variant="info">Online</Badge>
                    ) : null}
                    {summary.supportsInPerson ? (
                      <Badge variant="info">Stacjonarnie</Badge>
                    ) : null}
                    <Badge variant="neutral">
                      {formatSpecialistCountLabel(summary.specialistCount)}
                    </Badge>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </div>
  );
}
