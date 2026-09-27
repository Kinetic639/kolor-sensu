import {
  JsonLd,
  PrimaryButton,
  SecondaryButton,
  SoftCard,
  SpecialistArtwork,
} from "@repo/ui/public-site";
import { isRichTextEmpty } from "@repo/contracts";
import { RichTextRenderer } from "@repo/ui/rich-text-renderer";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { PageIntro } from "@/components/page-intro";
import { bookingCta, siteUrl } from "@/content/site";
import {
  portraitPlaceholder,
  specialistHref,
  specialistRole,
  specialistSplash,
} from "@/lib/presentation";
import {
  getSpecialist,
  getSpecialistRedirect,
  getSpecialists,
} from "@/lib/public-data";

// Published profiles are prerendered; a profile published later is
// rendered on its first visit and cached from then on.
export async function generateStaticParams() {
  const specialists = await getSpecialists();
  return specialists.map((specialist) => ({ slug: specialist.publicSlug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/specjalisci/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const specialist = await getSpecialist(slug);
  if (!specialist) return { title: "Nie znaleziono specjalisty" };
  return {
    title: `${specialist.displayName}, ${specialistRole(specialist)}`,
    description:
      specialist.shortBio ??
      `${specialist.displayName}: ${specialistRole(specialist)} w Kolor Sensu.`,
    alternates: { canonical: specialistHref(specialist.publicSlug) },
  };
}

function Facts({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="grid gap-3">
      <h2 className="text-title text-ink font-body">{title}</h2>
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => (
          <li
            key={item}
            className="bg-primary-soft text-ink text-small rounded-full px-3.5 py-1.5"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function SpecialistPage({
  params,
}: PageProps<"/specjalisci/[slug]">) {
  const { slug } = await params;
  const [specialist, all] = await Promise.all([
    getSpecialist(slug),
    getSpecialists(),
  ]);
  if (!specialist) {
    // An address the admin has since changed: send visitors (and search
    // engines) to the current one.
    const currentSlug = await getSpecialistRedirect(slug);
    if (currentSlug) permanentRedirect(specialistHref(currentSlug) as Route);
    notFound();
  }

  const index = Math.max(
    0,
    all.findIndex((one) => one.publicSlug === specialist.publicSlug),
  );
  const role = specialistRole(specialist);
  // The full bio is rich text written in the specialist portal; without one
  // the short bio stands in.
  const hasLongBio = !isRichTextEmpty(specialist.longBio);

  return (
    <>
      <PageIntro eyebrow={role} heading={specialist.displayName} />
      <section className="max-w-page px-gutter pb-section-sm mx-auto grid items-start gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div className="mx-auto w-full max-w-96">
          <SpecialistArtwork
            portraitSrc={
              specialist.portraitUrl ??
              specialist.photoUrl ??
              portraitPlaceholder
            }
            portraitAlt={`${specialist.displayName}, ${role}`}
            splash={specialistSplash(index)}
            sizes="(min-width: 1024px) 384px, 90vw"
            priority
          />
        </div>
        <div className="grid content-start gap-8">
          {hasLongBio ? (
            <RichTextRenderer
              className="text-body text-ink max-w-copy [&_a]:text-primary-strong [&_blockquote]:border-primary [&_h2]:font-display [&_h2]:text-h3 [&_h3]:font-display [&_h3]:text-title [&>:first-child]:mt-0"
              document={specialist.longBio}
            />
          ) : specialist.shortBio ? (
            <p className="text-body text-ink max-w-copy">
              {specialist.shortBio}
            </p>
          ) : null}
          <Facts title="Specjalizacje" items={specialist.specializations} />
          <Facts title="Podejście" items={specialist.therapyApproaches} />
          <Facts title="Formy pracy" items={specialist.modalities} />
          <Facts title="Języki" items={specialist.languages} />
          {specialist.education.length > 0 ||
          specialist.certificates.length > 0 ? (
            <SoftCard className="grid gap-3 p-6">
              <h2 className="text-title text-ink font-body">
                Wykształcenie i kwalifikacje
              </h2>
              <ul className="text-small text-text-muted grid list-disc gap-1.5 pl-5">
                {[...specialist.education, ...specialist.certificates].map(
                  (entry) => (
                    <li key={entry}>{entry}</li>
                  ),
                )}
              </ul>
            </SoftCard>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <PrimaryButton asChild arrow>
              <Link href="/umow-wizyte">{bookingCta.label}</Link>
            </PrimaryButton>
            <SecondaryButton asChild>
              <Link href="/specjalisci">Wszyscy specjaliści</Link>
            </SecondaryButton>
          </div>
          {specialist.acceptingNewClients ? (
            <p className="text-small text-primary-strong font-semibold">
              Przyjmuje nowe osoby.
            </p>
          ) : (
            <p className="text-small text-text-muted">
              Obecnie nie przyjmuje nowych osób. Pomożemy dobrać innego
              specjalistę.
            </p>
          )}
        </div>
      </section>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: specialist.displayName,
          jobTitle: role,
          description: specialist.shortBio ?? undefined,
          url: `${siteUrl}${specialistHref(specialist.publicSlug)}`,
          worksFor: { "@type": "MedicalBusiness", name: "Kolor Sensu" },
          knowsLanguage: specialist.languages,
        }}
      />
    </>
  );
}
