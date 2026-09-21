import { createPublicClient } from "@/lib/supabase/public";
import {
  formatPriceMinor,
  formatWorkshopDate,
  formatWorkshopTimeRange,
  workshopModalityLabels,
  workshopStatusLabels,
} from "@repo/contracts";
import { getPublicWorkshopBySlug } from "@repo/supabase";
import { Badge } from "@repo/ui/badge";
import { Container } from "@repo/ui/container";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const workshop = await getPublicWorkshopBySlug(createPublicClient(), slug);
  if (!workshop) return {};

  return {
    title: `${workshop.title} | Kolor Sensu`,
    description: workshop.shortDescription ?? "Warsztat grupowy w Kolor Sensu.",
  };
}

export default async function WorkshopDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const client = createPublicClient();
  const workshop = await getPublicWorkshopBySlug(client, slug);
  if (!workshop) notFound();

  const locationAddress = workshop.location
    ? [
        workshop.location.addressLine1,
        workshop.location.addressLine2,
        workshop.location.postalCode,
        workshop.location.city,
      ]
        .filter(Boolean)
        .join(", ")
    : null;

  return (
    <div className="py-10">
      <Container>
        <nav
          aria-label="Okruszki"
          className="mb-6 text-sm text-[var(--text-muted)]"
        >
          <Link className="hover:underline" href="/">
            Strona główna
          </Link>{" "}
          /{" "}
          <Link className="hover:underline" href="/warsztaty">
            Warsztaty
          </Link>{" "}
          / <span>{workshop.title}</span>
        </nav>
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-3xl font-semibold text-[var(--text)] sm:text-4xl">
            {workshop.title}
          </h1>
          {workshop.status !== "published" ? (
            <Badge
              variant={workshop.status === "cancelled" ? "danger" : "neutral"}
            >
              {workshopStatusLabels[workshop.status]}
            </Badge>
          ) : null}
        </div>
        {workshop.shortDescription ? (
          <p className="mb-6 text-lg text-[var(--text-muted)]">
            {workshop.shortDescription}
          </p>
        ) : null}
        <dl className="mb-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-[var(--text)]">Termin</dt>
            <dd className="text-[var(--text-muted)]">
              {formatWorkshopDate(workshop.startsAt)},{" "}
              {formatWorkshopTimeRange(workshop.startsAt, workshop.endsAt)}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-[var(--text)]">Cena</dt>
            <dd className="text-[var(--text-muted)]">
              {workshop.priceMinor === 0
                ? "Bezpłatnie"
                : formatPriceMinor(workshop.priceMinor, workshop.currencyCode)}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-[var(--text)]">
              Liczba miejsc
            </dt>
            <dd className="text-[var(--text-muted)]">{workshop.capacity}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-[var(--text)]">Zapisy</dt>
            <dd className="text-[var(--text-muted)]">
              {workshop.registrationEnabled
                ? "Zapisy wkrótce"
                : "Zapisy jeszcze niedostępne"}
            </dd>
          </div>
        </dl>
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <Badge variant="info">
            {workshopModalityLabels[workshop.modality]}
          </Badge>
        </div>
        {workshop.specialist ? (
          <section className="mb-8">
            <h2 className="font-heading mb-2 text-xl font-semibold text-[var(--text)]">
              Prowadzący
            </h2>
            <p className="text-[var(--text-muted)]">
              <Link
                className="font-semibold text-[var(--text)] hover:underline"
                href={`/specjalisci/${workshop.specialist.publicSlug}`}
              >
                {workshop.specialist.displayName}
              </Link>
              {workshop.specialist.professionalTitle
                ? ` · ${workshop.specialist.professionalTitle}`
                : ""}
            </p>
          </section>
        ) : null}
        {workshop.modality === "in_person" && workshop.location ? (
          <section className="mb-8">
            <h2 className="font-heading mb-2 text-xl font-semibold text-[var(--text)]">
              Lokalizacja
            </h2>
            {workshop.room ? (
              <p className="text-[var(--text-muted)]">
                <Link
                  className="font-semibold text-[var(--text)] hover:underline"
                  href={`/gabinety/${workshop.room.slug}`}
                >
                  {workshop.room.displayName}
                </Link>
                {" · "}
                {workshop.location.name}
              </p>
            ) : (
              <p className="text-[var(--text-muted)]">
                {workshop.location.name}
              </p>
            )}
            {locationAddress ? (
              <p className="text-sm text-[var(--text-muted)]">
                {locationAddress}
              </p>
            ) : null}
          </section>
        ) : null}
        {workshop.longDescription ? (
          <section className="mb-8">
            <h2 className="font-heading mb-2 text-xl font-semibold text-[var(--text)]">
              O warsztacie
            </h2>
            <p className="whitespace-pre-wrap text-[var(--text-muted)]">
              {workshop.longDescription}
            </p>
          </section>
        ) : null}
      </Container>
    </div>
  );
}
