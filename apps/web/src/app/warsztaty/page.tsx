import { createPublicClient } from "@/lib/supabase/public";
import {
  formatPriceMinor,
  formatWorkshopDate,
  formatWorkshopTimeRange,
  workshopModalityLabels,
} from "@repo/contracts";
import { listPublicWorkshops } from "@repo/supabase";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { Container } from "@repo/ui/container";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Warsztaty | Kolor Sensu",
  description: "Nadchodzące warsztaty grupowe w Kolor Sensu.",
};

// Unlike the other public list pages, this query filters by `starts_at >
// now()` -- if statically prerendered, "now" would freeze at build time
// and a workshop would never age out of (or into) the upcoming list
// without a rebuild. Forced dynamic so the list is always evaluated
// against the real current time.
export const dynamic = "force-dynamic";

export default async function WarsztatyPage() {
  const client = createPublicClient();
  // One query: upcoming published workshops with the specialist/location
  // context embedded -- no per-card query.
  const workshops = await listPublicWorkshops(client);

  return (
    <div className="py-10">
      <Container>
        <h1 className="font-heading mb-6 text-3xl font-semibold text-[var(--text)] sm:text-4xl">
          Warsztaty
        </h1>
        {workshops.length === 0 ? (
          <p className="text-[var(--text-muted)]">
            Obecnie nie zaplanowano żadnych nadchodzących warsztatów.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {workshops.map((workshop) => (
              <li key={workshop.id}>
                <Card className="space-y-3 p-5">
                  <div>
                    <h2 className="font-heading text-lg font-semibold text-[var(--text)]">
                      <Link
                        className="hover:underline"
                        href={`/warsztaty/${workshop.slug}`}
                      >
                        {workshop.title}
                      </Link>
                    </h2>
                    {workshop.shortDescription ? (
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        {workshop.shortDescription}
                      </p>
                    ) : null}
                  </div>
                  <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <div className="flex gap-1">
                      <dt className="font-medium text-[var(--text)]">
                        Termin:
                      </dt>
                      <dd className="text-[var(--text-muted)]">
                        {formatWorkshopDate(workshop.startsAt)},{" "}
                        {formatWorkshopTimeRange(
                          workshop.startsAt,
                          workshop.endsAt,
                        )}
                      </dd>
                    </div>
                    <div className="flex gap-1">
                      <dt className="font-medium text-[var(--text)]">Cena:</dt>
                      <dd className="text-[var(--text-muted)]">
                        {workshop.priceMinor === 0
                          ? "Bezpłatnie"
                          : formatPriceMinor(
                              workshop.priceMinor,
                              workshop.currencyCode,
                            )}
                      </dd>
                    </div>
                    <div className="flex gap-1">
                      <dt className="font-medium text-[var(--text)]">
                        Liczba miejsc:
                      </dt>
                      <dd className="text-[var(--text-muted)]">
                        {workshop.capacity}
                      </dd>
                    </div>
                  </dl>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="info">
                      {workshopModalityLabels[workshop.modality]}
                    </Badge>
                    {workshop.modality === "in_person" && workshop.location ? (
                      <Badge variant="neutral">{workshop.location.name}</Badge>
                    ) : null}
                    {workshop.specialist ? (
                      <Badge variant="neutral">
                        {workshop.specialist.displayName}
                      </Badge>
                    ) : null}
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/warsztaty/${workshop.slug}`}>Szczegóły</Link>
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </div>
  );
}
