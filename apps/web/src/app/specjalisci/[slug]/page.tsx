import {
  JsonLd,
  PrimaryButton,
  profileFacts,
  SecondaryButton,
  SpecialistProfileView,
} from "@repo/ui/public-site";
import { clientGroupLabels } from "@repo/contracts";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { PageIntro } from "@/components/page-intro";
import { bookingCta, siteUrl } from "@/content/site";
import { bookingHref } from "@/features/booking/search-params";
import { serviceHref } from "@/lib/site-frame";
import {
  formatDuration,
  formatPrice,
  NOT_TAKING_CLIENTS,
  offerModes,
  portraitPlaceholder,
  specialistHref,
  specialistRole,
  specialistSplash,
} from "@/lib/presentation";
import {
  getSpecialist,
  getSpecialistOffers,
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

export default async function SpecialistPage({
  params,
}: PageProps<"/specjalisci/[slug]">) {
  const { slug } = await params;
  const [specialist, all, offers] = await Promise.all([
    getSpecialist(slug),
    getSpecialists(),
    getSpecialistOffers(slug),
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

  return (
    <>
      <PageIntro eyebrow={role} heading={specialist.displayName} />
      <SpecialistProfileView
        actions={
          <>
            {specialist.active ? (
              <PrimaryButton asChild arrow>
                <Link
                  href={bookingHref({ specjalista: specialist.publicSlug })}
                >
                  {bookingCta.label}
                </Link>
              </PrimaryButton>
            ) : (
              // Visible but not taking new clients (#63): no booking.
              <p className="text-body text-text-muted">
                {`Obecnie ${NOT_TAKING_CLIENTS}.`}
              </p>
            )}
            <SecondaryButton asChild>
              <Link href="/specjalisci">Wszyscy specjaliści</Link>
            </SecondaryButton>
          </>
        }
        className="max-w-page px-gutter pb-section-sm mx-auto"
        facts={profileFacts({
          ...specialist,
          clientGroups: clientGroupLabels(specialist.clientGroups),
        })}
        linkAs={Link}
        longBio={specialist.longBio}
        name={specialist.displayName}
        offers={offers.map((offer) => ({
          key: offer.serviceId,
          name: offer.serviceName,
          href: serviceHref(offer.serviceSlug),
          meta: [
            formatDuration(offer.effectiveDurationMinutes),
            offerModes(offer),
          ]
            .filter(Boolean)
            .join(" · "),
          price: formatPrice(offer),
        }))}
        portraitSrc={
          specialist.portraitUrl ?? specialist.photoUrl ?? portraitPlaceholder
        }
        priority
        qualifications={[...specialist.education, ...specialist.certificates]}
        role={role}
        shortBio={specialist.shortBio}
        splash={specialistSplash(index)}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: specialist.displayName,
          jobTitle: role,
          description: specialist.shortBio ?? undefined,
          url: `${siteUrl}${specialistHref(specialist.publicSlug)}`,
          // A lasting address (zdjecie/route.ts), not the expiring one.
          image:
            specialist.photoUrl || specialist.portraitUrl
              ? `${siteUrl}${specialistHref(specialist.publicSlug)}/zdjecie`
              : undefined,
          worksFor: { "@type": "MedicalBusiness", name: "Kolor Sensu" },
          knowsLanguage: specialist.languages,
        }}
      />
    </>
  );
}
