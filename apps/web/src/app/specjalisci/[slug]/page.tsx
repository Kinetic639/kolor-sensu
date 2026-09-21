import { createPublicClient } from "@/lib/supabase/public";
import { formatPriceMinor } from "@repo/contracts";
import {
  createSpecialistMediaSignedUrl,
  getPublishedSpecialistBySlug,
  listPublicSpecialistOffersForSpecialist,
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
  const specialist = await getPublishedSpecialistBySlug(
    createPublicClient(),
    slug,
  );
  if (!specialist) {
    return { title: "Specjalista | Kolor Sensu" };
  }
  return {
    title: `${specialist.displayName} | Kolor Sensu`,
    description:
      specialist.shortBio ||
      `Profil specjalisty ${specialist.displayName} w Kolor Sensu.`,
  };
}

const profileFieldLabels = [
  { key: "specializations", label: "Specjalizacje" },
  { key: "therapyApproaches", label: "Podejścia terapeutyczne" },
  { key: "modalities", label: "Formy pracy" },
  { key: "languages", label: "Języki" },
  { key: "education", label: "Wykształcenie" },
  { key: "certificates", label: "Certyfikaty" },
] as const;

export default async function SpecialistDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const client = createPublicClient();
  const specialist = await getPublishedSpecialistBySlug(client, slug);
  if (!specialist) notFound();

  const [profilePhotoUrl, portraitPhotoUrl, offers] = await Promise.all([
    createSpecialistMediaSignedUrl(client, specialist.profilePhotoUrl),
    createSpecialistMediaSignedUrl(client, specialist.portraitPhotoUrl),
    listPublicSpecialistOffersForSpecialist(client, slug),
  ]);

  const detailFields = profileFieldLabels
    .map((field) => ({ label: field.label, values: specialist[field.key] }))
    .filter((field) => field.values.length > 0);

  return (
    <div className="py-10">
      <Container className="space-y-8">
        <nav aria-label="Okruszki" className="text-sm text-[var(--text-muted)]">
          <Link className="hover:text-[var(--text)]" href="/">
            Strona główna
          </Link>{" "}
          /{" "}
          <Link className="hover:text-[var(--text)]" href="/specjalisci">
            Specjaliści
          </Link>{" "}
          / <span className="text-[var(--text)]">{specialist.displayName}</span>
        </nav>

        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <Avatar className="size-24 shrink-0">
            {profilePhotoUrl ? (
              <AvatarImage alt="" src={profilePhotoUrl} />
            ) : null}
            <AvatarFallback className="text-2xl">
              {specialist.displayName.slice(0, 2).toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-heading text-3xl font-semibold text-[var(--text)] sm:text-4xl">
              {specialist.displayName}
            </h1>
            {specialist.professionalTitle ? (
              <p className="mt-1 text-[var(--text-muted)]">
                {specialist.professionalTitle}
              </p>
            ) : null}
            {specialist.acceptingNewClients ? (
              <Badge className="mt-3" variant="success">
                Przyjmuje nowych klientów
              </Badge>
            ) : null}
          </div>
        </div>

        {portraitPhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed
          // private-bucket URL from a dynamic per-environment host; see
          // docs/architecture/public-web-shell.md for why next/image is
          // deferred here.
          <img
            alt={`Zdjęcie ${specialist.displayName}`}
            className="max-h-96 w-full rounded-[var(--radius-surface)] object-cover"
            src={portraitPhotoUrl}
          />
        ) : null}

        {specialist.longBio || specialist.shortBio ? (
          <section aria-labelledby="bio-heading">
            <h2 className="sr-only" id="bio-heading">
              O specjaliście
            </h2>
            <p className="whitespace-pre-line text-[var(--text)]">
              {specialist.longBio || specialist.shortBio}
            </p>
          </section>
        ) : null}

        {detailFields.length > 0 ? (
          <dl className="grid gap-4 sm:grid-cols-2">
            {detailFields.map((field) => (
              <div key={field.label}>
                <dt className="font-medium text-[var(--text)]">
                  {field.label}
                </dt>
                <dd className="mt-1 flex flex-wrap gap-2">
                  {field.values.map((value) => (
                    <Badge key={value} variant="neutral">
                      {value}
                    </Badge>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {offers.length > 0 ? (
          <section aria-labelledby="offers-heading">
            <h2
              className="font-heading mb-4 text-xl font-semibold text-[var(--text)]"
              id="offers-heading"
            >
              Oferowane usługi
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2">
              {offers.map((offer) => (
                <li key={offer.serviceId}>
                  <Card className="space-y-2 p-5">
                    <Link
                      className="font-heading text-lg font-semibold text-[var(--text)] hover:underline"
                      href={`/oferta/${offer.serviceSlug}`}
                    >
                      {offer.serviceName}
                    </Link>
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
