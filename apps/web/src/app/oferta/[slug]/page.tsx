import { createPublicClient } from "@/lib/supabase/public";
import { buildPublicOfferSummary, formatPriceMinor } from "@repo/contracts";
import {
  createSpecialistMediaSignedUrl,
  getPublicServiceBySlug,
  listPublicSpecialistOffersForService,
} from "@repo/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/avatar";
import { Badge } from "@repo/ui/badge";
import { Card } from "@repo/ui/card";
import { Container } from "@repo/ui/container";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = await getPublicServiceBySlug(createPublicClient(), slug);
  if (!service) {
    return { title: "Usługa | Kolor Sensu" };
  }
  return {
    title: `${service.name} | Kolor Sensu`,
    description:
      service.shortDescription || `Usługa ${service.name} w Kolor Sensu.`,
  };
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const client = createPublicClient();
  const service = await getPublicServiceBySlug(client, slug);
  if (!service) notFound();

  const offers = await listPublicSpecialistOffersForService(client, slug);
  const summary = buildPublicOfferSummary(service, offers);
  const offersWithPhotos = await Promise.all(
    offers.map(async (offer) => ({
      offer,
      photoUrl: await createSpecialistMediaSignedUrl(
        client,
        offer.specialistProfilePhotoUrl,
      ),
    })),
  );

  return (
    <div className="py-10">
      <Container className="space-y-8">
        <nav aria-label="Okruszki" className="text-sm text-[var(--text-muted)]">
          <Link className="hover:text-[var(--text)]" href="/">
            Strona główna
          </Link>{" "}
          /{" "}
          <Link className="hover:text-[var(--text)]" href="/oferta">
            Oferta
          </Link>{" "}
          / <span className="text-[var(--text)]">{service.name}</span>
        </nav>

        <div>
          <h1 className="font-heading text-3xl font-semibold text-[var(--text)] sm:text-4xl">
            {service.name}
          </h1>
          {service.description || service.shortDescription ? (
            <p className="mt-3 whitespace-pre-line text-[var(--text)]">
              {service.description || service.shortDescription}
            </p>
          ) : null}
        </div>

        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div className="flex gap-1">
            <dt className="font-medium text-[var(--text)]">Czas trwania:</dt>
            <dd className="text-[var(--text-muted)]">
              {service.defaultDurationMinutes} min
            </dd>
          </div>
          <div className="flex gap-1">
            <dt className="font-medium text-[var(--text)]">Cena:</dt>
            <dd className="text-[var(--text-muted)]">
              {summary.minPriceMinor !== null && summary.minPriceCurrencyCode
                ? `od ${formatPriceMinor(summary.minPriceMinor, summary.minPriceCurrencyCode)}`
                : "Cena ustalana indywidualnie"}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap items-center gap-2">
          {summary.supportsOnline ? <Badge variant="info">Online</Badge> : null}
          {summary.supportsInPerson ? (
            <Badge variant="info">Stacjonarnie</Badge>
          ) : null}
        </div>

        {offersWithPhotos.length > 0 ? (
          <section aria-labelledby="specialists-heading">
            <h2
              className="font-heading mb-4 text-xl font-semibold text-[var(--text)]"
              id="specialists-heading"
            >
              Specjaliści oferujący tę usługę
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2">
              {offersWithPhotos.map(({ offer, photoUrl }) => (
                <li key={offer.specialistPublicSlug}>
                  <Card className="space-y-3 p-5">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-12">
                        {photoUrl ? (
                          <AvatarImage alt="" src={photoUrl} />
                        ) : null}
                        <AvatarFallback>
                          {offer.specialistDisplayName
                            .slice(0, 2)
                            .toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <Link
                          className="font-semibold text-[var(--text)] hover:underline"
                          href={`/specjalisci/${offer.specialistPublicSlug}`}
                        >
                          {offer.specialistDisplayName}
                        </Link>
                        {offer.specialistProfessionalTitle ? (
                          <p className="text-sm text-[var(--text-muted)]">
                            {offer.specialistProfessionalTitle}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <p className="text-sm text-[var(--text-muted)]">
                      {offer.effectiveDurationMinutes} min &middot;{" "}
                      {formatPriceMinor(offer.priceMinor, offer.currencyCode)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {offer.supportsOnline ? (
                        <Badge variant="info">Online</Badge>
                      ) : null}
                      {offer.supportsInPerson ? (
                        <Badge variant="info">Stacjonarnie</Badge>
                      ) : null}
                      {offer.acceptingNewClients ? (
                        <Badge variant="success">
                          Przyjmuje nowych klientów
                        </Badge>
                      ) : null}
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </Container>
    </div>
  );
}
