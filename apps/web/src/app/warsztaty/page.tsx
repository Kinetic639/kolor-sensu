import { FeatureSection, SoftCard, WorkshopGrid } from "@repo/ui/public-site";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { ClosingCta } from "@/components/closing-cta";
import { PageIntro } from "@/components/page-intro";
import { workshops } from "@/content/site";
import {
  readModality,
  splitWorkshops,
  workshopCard,
  type ModalityFilter,
} from "@/features/workshops/workshop-view";
import { pageMetadata } from "@/lib/page-metadata";
import {
  getBookingWindow,
  getClosingCta,
  getWatercolorLook,
  getWorkshopsPage,
} from "@/lib/public-data";
import { getWorkshops, workshopImageUrl } from "@/lib/workshop-data";

// Warsztaty (docs/product/workshops-plan.md, PR 3): the coming workshops,
// soonest first, with their seats (a cancelled one labelled until its day),
// filtered by form from the address (?forma=online|stacjonarnie); the past
// ones below; with none coming, the word and the way to ask. Refreshed every
// minute, as the seats change. Its top and the line for none: the CMS's
// (workshops_page, #210).

export const revalidate = 60;

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("workshops");
}

const FILTERS: { value: ModalityFilter; label: string }[] = [
  { value: null, label: "Wszystkie" },
  { value: "stacjonarnie", label: "Stacjonarnie" },
  { value: "online", label: "Online" },
];

const filterHref = (value: ModalityFilter) =>
  (value ? `/warsztaty?forma=${value}` : "/warsztaty") as Route;

export default async function WorkshopsPage({
  searchParams,
}: PageProps<"/warsztaty">) {
  const filter = readModality((await searchParams).forma);
  const [all, window, watercolor, closing, words] = await Promise.all([
    getWorkshops(),
    getBookingWindow(),
    getWatercolorLook(),
    getClosingCta(),
    getWorkshopsPage(),
  ]);
  const now = new Date();
  const timeZone = window?.timeZone ?? "Europe/Warsaw";
  const card = (one: (typeof all)[number]) =>
    workshopCard(one, { now, timeZone, imageUrl: workshopImageUrl });
  const { upcoming, past } = splitWorkshops(all, now, filter);
  const anyComing = splitWorkshops(all, now).upcoming.length > 0;

  return (
    <>
      <PageIntro header={words.intro} />
      <section
        aria-labelledby="nadchodzace"
        className="max-w-page px-gutter mx-auto grid gap-6"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-h2 text-ink" id="nadchodzace">
            Nadchodzące warsztaty
          </h2>
          {anyComing ? (
            <nav aria-label="Forma warsztatów">
              <ul className="flex flex-wrap gap-2">
                {FILTERS.map((option) => (
                  <li key={option.label}>
                    <Link
                      aria-current={
                        option.value === filter ? "page" : undefined
                      }
                      className="border-border text-small text-ink aria-[current=page]:bg-primary aria-[current=page]:text-on-primary focus-visible:outline-ring inline-flex rounded-full border px-4 py-1.5 focus-visible:outline-2"
                      href={filterHref(option.value)}
                      scroll={false}
                    >
                      {option.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>
        {upcoming.length ? (
          <WorkshopGrid workshops={upcoming.map(card)} />
        ) : (
          <SoftCard className="grid gap-3 p-6 lg:p-8" tone="cream">
            <p className="text-body text-text-muted max-w-copy">
              {anyComing
                ? "W tej formie nie mamy teraz zaplanowanych warsztatów."
                : words.emptyText}
            </p>
            <p>
              <Link
                className="text-body text-primary-strong font-semibold underline"
                href={anyComing ? filterHref(null) : "/kontakt"}
              >
                {anyComing ? "Pokaż wszystkie" : "Zapytaj o najbliższe terminy"}
              </Link>
            </p>
          </SoftCard>
        )}
      </section>

      {past.length ? (
        <section
          aria-labelledby="minione"
          className="max-w-page px-gutter mx-auto mt-16 grid gap-6"
        >
          <h2 className="font-display text-h2 text-ink" id="minione">
            Minione warsztaty
          </h2>
          <WorkshopGrid workshops={past.map(card)} />
        </section>
      ) : null}

      <FeatureSection
        {...workshops}
        heading="Grupy i warsztaty tematyczne"
        cta={{ href: "/kontakt", label: "Zapytaj o najbliższe terminy" }}
        imagePosition="left"
        animationPreset="watercolor-reveal"
        watercolor={watercolor}
      />
      <ClosingCta words={closing} />
    </>
  );
}
