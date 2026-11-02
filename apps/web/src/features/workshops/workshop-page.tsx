import { ArticleRenderer } from "@repo/ui/article-renderer";
import {
  ArticleCover,
  JsonLd,
  PersonPhoto,
  SoftCard,
  WorkshopFacts,
  WorkshopGrid,
} from "@repo/ui/public-site";
import { articleDocumentSchema } from "@repo/contracts/article-rich-text";
import type { PublicWorkshop } from "@repo/supabase/workshops";
import type { Route } from "next";
import Link from "next/link";
import { siteUrl } from "@/content/site";
import { bookingHref } from "@/features/booking/search-params";
import { deadlineLabel } from "@/features/booking/visit-label";
import { newsletterSiteKey } from "@/features/newsletter/site-key";
import { SignupForm, WaitlistForm } from "@/features/workshops/signup-forms";
import { readSeatNotice } from "@/features/workshops/signup-paths";
import {
  agendaPoints,
  leadersLabel,
  relatedServices,
  relatedWorkshops,
  seatsWord,
  signupState,
  workshopCard,
  workshopDateLabel,
  workshopEventJsonLd,
  workshopNoticeAt,
  workshopPlace,
  workshopPrice,
  workshopRules,
  workshopTimeLabel,
} from "@/features/workshops/workshop-view";
import { specialistHref } from "@/lib/presentation";
import { WorkshopPlace } from "@/features/workshops/workshop-place";
import { ArticlesSection } from "@/features/education/articles-section";
import { toPeople } from "@/features/education/article-page";
import { getArticleCategories, getArticles } from "@/lib/education-data";
import {
  getServices,
  getSpecialistOffers,
  getSpecialists,
  getWorkshopsPage,
} from "@/lib/public-data";
import { serviceHref } from "@/lib/site-frame";
import {
  getWorkshopPicks,
  getWorkshops,
  workshopImageUrl,
} from "@/lib/workshop-data";

// A workshop's page, the site's and the admin's preview of a draft
// (#197): the one H1 with when, where, who leads, the price and the seats;
// the sign-up (in the preview, a word that it opens once published); the
// cover, the description, who it is for, the program, the leaders, the
// rules; the leader's services and other workshops (#185); the Event data.

export async function WorkshopPageView({
  workshop,
  timeZone,
  notice = null,
  preview = false,
}: {
  workshop: PublicWorkshop;
  timeZone: string;
  notice?: ReturnType<typeof readSeatNotice>;
  preview?: boolean;
}) {
  const now = new Date();
  const state = signupState(workshop, now);
  // Powiązane (#185): the services and articles the admin picked (the
  // leader's services when no service is picked), other coming workshops.
  const leader = workshop.leaders[0] ?? null;
  const [
    all,
    leaderOffers,
    specialists,
    words,
    picks,
    allServices,
    allArticles,
    categories,
  ] = await Promise.all([
    getWorkshops(),
    leader ? getSpecialistOffers(leader.slug) : Promise.resolve([]),
    getSpecialists(),
    getWorkshopsPage(),
    getWorkshopPicks(workshop.id, preview),
    getServices(),
    getArticles(),
    getArticleCategories(),
  ]);
  const pickedServices = allServices.filter((one) =>
    picks.serviceIds.includes(one.id),
  );
  const pickedArticles = allArticles.filter((one) =>
    picks.articleIds.includes(one.id),
  );
  // The leaders' photos, as their profiles show them (#230).
  const photoOf = (slug: string) => {
    const profile = specialists.find((one) => one.publicSlug === slug);
    return profile ? (profile.portraitUrl ?? profile.photoUrl) : null;
  };
  const others = relatedWorkshops(workshop, all, now).map((one) =>
    workshopCard(one, { now, timeZone, imageUrl: workshopImageUrl }),
  );
  const services = relatedServices(leaderOffers);
  const when = `${workshopDateLabel(workshop.startsAt, timeZone)}, ${workshopTimeLabel(workshop.startsAt, workshop.endsAt, timeZone)}`;
  const leaders = leadersLabel(workshop);
  const agenda = agendaPoints(workshop.agenda);
  // None once cancelled or over; the last week's when it has begun (#275).
  const rules = workshopRules(
    workshop,
    now,
    deadlineLabel(workshopNoticeAt(workshop).toISOString(), timeZone),
  );
  const siteKey = newsletterSiteKey();
  const body = articleDocumentSchema.safeParse(workshop.body);

  return (
    <article className="grid gap-12 pb-16 lg:gap-16">
      <header className="max-w-page px-gutter mx-auto grid w-full gap-8 pt-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:pt-12">
        <div className="grid content-start gap-5">
          <p className="text-eyebrow text-primary-strong uppercase">
            <Link className="hover:underline" href="/warsztaty">
              Warsztaty
            </Link>
            {state === "cancelled"
              ? " · Odwołany"
              : state === "past"
                ? " · Zakończony"
                : workshop.minParticipants
                  ? workshop.confirmed
                    ? " · Potwierdzony"
                    : " · Czeka na komplet"
                  : null}
          </p>
          <h1 className="font-display text-display text-ink text-balance">
            {workshop.title}
          </h1>
          {workshop.shortDescription ? (
            <p className="text-lead text-text-muted max-w-copy">
              {workshop.shortDescription}
            </p>
          ) : null}
          <WorkshopFacts
            facts={[
              { icon: "date", label: "Termin", value: when },
              {
                icon: "place",
                label: "Miejsce",
                value: (
                  <WorkshopPlace
                    locationAddress={workshop.locationAddress}
                    locationDirections={workshop.locationDirections}
                    locationName={workshop.locationName}
                    modality={workshop.modality}
                    place={workshopPlace(workshop, { room: true })}
                  />
                ),
              },
              ...(leaders
                ? [
                    {
                      icon: "people" as const,
                      label: "Prowadzi",
                      value: leaders,
                    },
                  ]
                : []),
            ]}
          />
        </div>

        <SoftCard
          className="grid scroll-mt-24 content-start gap-4 p-6"
          id="zapis"
          tone="cream"
        >
          <p className="font-display text-h3 text-ink">
            {workshopPrice(workshop)}
          </p>
          {notice ? (
            <p
              className="rounded-card-sm bg-pink-soft text-small text-ink p-3"
              role="alert"
            >
              {notice}
            </p>
          ) : null}
          {preview ? (
            <p className="text-body text-text-muted">
              Podgląd szkicu: zapisy ruszą, gdy opublikujesz warsztat.
            </p>
          ) : state === "open" ? (
            <>
              <p className="text-small text-text-muted">
                Wolne: {seatsWord(workshop.seatsLeft)} z {workshop.capacity}.
              </p>
              {siteKey ? (
                <SignupForm
                  label="Zapisz się"
                  slug={workshop.slug}
                  turnstileSiteKey={siteKey}
                />
              ) : (
                <p className="text-small text-text-muted">
                  Zapisy online są chwilowo niedostępne.{" "}
                  <Link className="underline" href="/kontakt">
                    Zapisz się przez kontakt
                  </Link>
                  .
                </p>
              )}
            </>
          ) : state === "full" ? (
            <>
              <p className="text-body text-ink font-semibold">
                Brak wolnych miejsc
              </p>
              <WaitlistForm slug={workshop.slug} />
            </>
          ) : (
            <p className="text-body text-ink">
              {state === "closed"
                ? "Zapisy są zamknięte."
                : state === "cancelled"
                  ? "Ten warsztat został odwołany."
                  : "Ten warsztat już się odbył."}{" "}
              <Link className="text-primary-strong underline" href="/kontakt">
                Zapytaj o kolejne terminy
              </Link>
              .
            </p>
          )}
        </SoftCard>
      </header>

      {workshop.coverPath ? (
        <ArticleCover
          alt={workshop.coverAlt ?? ""}
          url={workshopImageUrl(workshop.coverPath)}
        />
      ) : null}

      {body.success ? (
        <ArticleRenderer
          bookingHref={(service) =>
            bookingHref(service ? { usluga: service } : {})
          }
          className="px-gutter"
          document={body.data}
          imageUrl={workshopImageUrl}
        />
      ) : null}

      {workshop.audience || agenda.length ? (
        <section className="px-gutter mx-auto grid w-full max-w-[46rem] gap-8">
          {workshop.audience ? (
            <div className="grid gap-3">
              <h2 className="font-display text-h2 text-ink">Dla kogo</h2>
              <p className="text-body text-ink whitespace-pre-line">
                {workshop.audience}
              </p>
            </div>
          ) : null}
          {agenda.length ? (
            <div className="grid gap-3">
              <h2 className="font-display text-h2 text-ink">Program</h2>
              <ol className="text-body text-ink grid list-decimal gap-2 pl-6">
                {agenda.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ol>
            </div>
          ) : null}
        </section>
      ) : null}

      {workshop.leaders.length ? (
        <section className="px-gutter mx-auto grid w-full max-w-[46rem] gap-3">
          <h2 className="font-display text-h2 text-ink">
            {workshop.leaders.length > 1 ? "Prowadzą" : "Prowadzi"}
          </h2>
          <ul className="grid gap-2">
            {workshop.leaders.map((leader) => (
              <li
                className="text-body flex items-center gap-3"
                key={leader.slug}
              >
                <PersonPhoto
                  person={{
                    name: leader.name,
                    href: specialistHref(leader.slug),
                    title: leader.title,
                    photoUrl: photoOf(leader.slug),
                  }}
                  size="size-12"
                />
                <span>
                  <Link
                    className="text-primary-strong font-semibold underline"
                    href={specialistHref(leader.slug) as Route}
                  >
                    {leader.name}
                  </Link>
                  {leader.title ? (
                    <span className="text-text-muted">, {leader.title}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {rules ? (
        <section className="px-gutter mx-auto grid w-full max-w-[46rem] gap-3">
          <h2 className="font-display text-h2 text-ink">Zasady</h2>
          <ul className="text-body text-ink grid list-disc gap-2 pl-6">
            {/* The workshop's own, then the ones every workshop shares,
                from the CMS (#231). */}
            {[...rules, ...words.rules].map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {pickedServices.length ? (
        <section
          aria-labelledby="powiazane-uslugi"
          className="px-gutter mx-auto grid w-full max-w-[46rem] gap-3"
        >
          <h2 className="font-display text-h2 text-ink" id="powiazane-uslugi">
            Powiązane usługi
          </h2>
          <ul className="grid gap-2">
            {pickedServices.map((service) => (
              <li className="text-body" key={service.slug}>
                <Link
                  className="text-primary-strong font-semibold underline"
                  href={serviceHref(service.slug) as Route}
                >
                  {service.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : leader && services.length ? (
        <section
          aria-labelledby="z-prowadzacym"
          className="px-gutter mx-auto grid w-full max-w-[46rem] gap-3"
        >
          <h2 className="font-display text-h2 text-ink" id="z-prowadzacym">
            Indywidualnie: {leader.name}
          </h2>
          <ul className="grid gap-2">
            {services.map((service) => (
              <li className="text-body" key={service.slug}>
                <Link
                  className="text-primary-strong font-semibold underline"
                  href={serviceHref(service.slug) as Route}
                >
                  {service.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ArticlesSection
        articles={pickedArticles}
        categories={categories}
        heading="Warto przeczytać"
        id="artykuly-warsztatu"
        people={toPeople(specialists)}
      />

      {others.length ? (
        <section
          aria-labelledby="inne-warsztaty"
          className="max-w-page px-gutter mx-auto grid w-full gap-6"
        >
          <h2 className="font-display text-h2 text-ink" id="inne-warsztaty">
            Inne warsztaty
          </h2>
          <WorkshopGrid workshops={others} />
        </section>
      ) : null}

      <JsonLd
        data={workshopEventJsonLd(workshop, {
          siteUrl,
          imageUrl: workshopImageUrl,
        })}
      />
    </article>
  );
}
