import { ArticleRenderer } from "@repo/ui/article-renderer";
import {
  ArticleCover,
  JsonLd,
  SoftCard,
  WorkshopFacts,
} from "@repo/ui/public-site";
import { articleDocumentSchema } from "@repo/contracts/article-rich-text";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { siteUrl } from "@/content/site";
import { bookingHref } from "@/features/booking/search-params";
import { deadlineLabel } from "@/features/booking/visit-label";
import { newsletterSiteKey } from "@/features/newsletter/site-key";
import { SignupForm, WaitlistForm } from "@/features/workshops/signup-forms";
import { readSeatNotice } from "@/features/workshops/signup-paths";
import {
  agendaPoints,
  leadersLabel,
  peopleWord,
  seatsWord,
  signupState,
  workshopDateLabel,
  workshopEventJsonLd,
  workshopHref,
  workshopPlace,
  workshopPrice,
  workshopSeo,
  workshopTimeLabel,
} from "@/features/workshops/workshop-view";
import { baseOpenGraph } from "@/lib/page-metadata";
import { specialistHref } from "@/lib/presentation";
import { getBookingWindow } from "@/lib/public-data";
import { getWorkshop, workshopImageUrl } from "@/lib/workshop-data";

// A workshop's page (docs/product/workshops-plan.md, PR 3 and 4): the one
// H1 with when, where, who leads, the price and the seats; the sign-up (or
// the waitlist when full, or why one cannot sign up); the cover, the
// description, who it is for and the program; the leaders; the rules
// (refunds, paying later, the minimum); the Event data for Google. A draft
// is not found; a cancelled or past one stays, labelled.

export const revalidate = 60;

export async function generateMetadata({
  params,
}: PageProps<"/warsztaty/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const workshop = await getWorkshop(slug);
  if (!workshop) return { title: "Nie znaleziono warsztatu" };
  const seo = workshopSeo(workshop);
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: workshopHref(workshop.slug) },
    openGraph: {
      ...baseOpenGraph,
      title: seo.title,
      description: seo.description,
      url: workshopHref(workshop.slug),
      // The cover, or else the list's picture (an own openGraph drops it).
      images: [
        workshop.coverPath
          ? {
              url: workshopImageUrl(workshop.coverPath),
              alt: workshop.coverAlt ?? workshop.title,
            }
          : {
              url: "/warsztaty/opengraph-image",
              alt: "Warsztaty · Kolor Sensu",
            },
      ],
    },
  };
}

export default async function WorkshopPage({
  params,
  searchParams,
}: PageProps<"/warsztaty/[slug]">) {
  const { slug } = await params;
  const notice = readSeatNotice((await searchParams).zapis);
  const [workshop, window] = await Promise.all([
    getWorkshop(slug),
    getBookingWindow(),
  ]);
  if (!workshop) notFound();

  const now = new Date();
  const timeZone = window?.timeZone ?? "Europe/Warsaw";
  const state = signupState(workshop, now);
  const when = `${workshopDateLabel(workshop.startsAt, timeZone)}, ${workshopTimeLabel(workshop.startsAt, workshop.endsAt, timeZone)}`;
  const leaders = leadersLabel(workshop);
  const agenda = agendaPoints(workshop.agenda);
  const noticeDate = deadlineLabel(
    new Date(
      new Date(workshop.startsAt).getTime() - 7 * 86_400_000,
    ).toISOString(),
    timeZone,
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
                value: workshopPlace(workshop, { room: true }),
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
          {state === "open" ? (
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
              <li className="text-body" key={leader.slug}>
                <Link
                  className="text-primary-strong font-semibold underline"
                  href={specialistHref(leader.slug) as Route}
                >
                  {leader.name}
                </Link>
                {leader.title ? (
                  <span className="text-text-muted">, {leader.title}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="px-gutter mx-auto grid w-full max-w-[46rem] gap-3">
        <h2 className="font-display text-h2 text-ink">Zasady</h2>
        <ul className="text-body text-ink grid list-disc gap-2 pl-6">
          {workshop.priceMinor > 0 ? (
            <>
              <li>
                Rezygnacja do {noticeDate}: pełny zwrot. Później zwracamy
                pieniądze, gdy Twoje miejsce zajmie ktoś z listy rezerwowej;
                możesz też przekazać miejsce innej osobie.
              </li>
              <li>
                Możesz zapłacić od razu albo zarezerwować miejsce i zapłacić do{" "}
                {noticeDate}; bez wpłaty miejsce się zwalnia.
              </li>
            </>
          ) : null}
          {workshop.minParticipants ? (
            <li>
              Warsztat odbędzie się, gdy zapisze się co najmniej{" "}
              {peopleWord(workshop.minParticipants)}. Gdyby nie doszedł do
              skutku, oddamy całą wpłatę.
            </li>
          ) : null}
          <li>Gdy warsztat odwołamy my, zawsze oddajemy całą wpłatę.</li>
          {workshop.modality === "online" ? (
            <li>Link do spotkania wyślemy e-mailem dzień przed warsztatem.</li>
          ) : null}
        </ul>
      </section>

      <JsonLd
        data={workshopEventJsonLd(workshop, {
          siteUrl,
          imageUrl: workshopImageUrl,
        })}
      />
    </article>
  );
}
