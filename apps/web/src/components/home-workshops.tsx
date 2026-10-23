import { WorkshopGrid } from "@repo/ui/public-site";
import Link from "next/link";
import {
  splitWorkshops,
  workshopCard,
} from "@/features/workshops/workshop-view";
import { getBookingWindow } from "@/lib/public-data";
import {
  getWorkshops,
  getWorkshopVisibility,
  workshopImageUrl,
} from "@/lib/workshop-data";

// The homepage's coming workshops (docs/product/workshops-plan.md): the
// next two, while the portal's switch shows them and any are planned;
// otherwise nothing.

export async function HomeWorkshops() {
  const [visibility, all, window] = await Promise.all([
    getWorkshopVisibility(),
    getWorkshops(),
    getBookingWindow(),
  ]);
  if (!visibility.onHome) return null;
  const now = new Date();
  const next = splitWorkshops(all, now)
    .upcoming.filter((workshop) => workshop.status === "published")
    .slice(0, 2);
  if (!next.length) return null;
  const timeZone = window?.timeZone ?? "Europe/Warsaw";

  return (
    <section
      aria-labelledby="najblizsze-warsztaty"
      className="max-w-page px-gutter py-section-sm mx-auto grid gap-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-2">
          <p className="text-eyebrow text-primary-strong uppercase">
            Warsztaty
          </p>
          <h2
            className="font-display text-h2 text-ink"
            id="najblizsze-warsztaty"
          >
            Najbliższe warsztaty
          </h2>
        </div>
        <Link
          className="text-body text-primary-strong font-semibold underline"
          href="/warsztaty"
        >
          Wszystkie warsztaty
        </Link>
      </div>
      <WorkshopGrid
        workshops={next.map((workshop) =>
          workshopCard(workshop, {
            now,
            timeZone,
            imageUrl: workshopImageUrl,
          }),
        )}
      />
    </section>
  );
}
