import {
  WorkshopGrid,
  SectionHeader,
  HanddrawnLink,
} from "@repo/ui/public-site";
import { defaultHomeHeaders, type SectionHeaderContent } from "@repo/contracts";
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

export async function HomeWorkshops({
  header = defaultHomeHeaders.workshops,
}: { header?: SectionHeaderContent } = {}) {
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
      className="ks-home-workshops max-w-page px-gutter py-section-sm mx-auto grid gap-10"
    >
      <SectionHeader
        content={{ ...header, cta: null }}
        align="center"
        id="najblizsze-warsztaty"
      />
      <div className="ks-home-workshops__cards">
        <WorkshopGrid
          workshops={next.map((workshop) =>
            workshopCard(workshop, {
              now,
              timeZone,
              imageUrl: workshopImageUrl,
            }),
          )}
        />
      </div>
      <HanddrawnLink
        href={header.cta?.href ?? "/warsztaty"}
        className="justify-self-center"
      >
        {header.cta?.label ?? "Więcej warsztatów"}
      </HanddrawnLink>
    </section>
  );
}
