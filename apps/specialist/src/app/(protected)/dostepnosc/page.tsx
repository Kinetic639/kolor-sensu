import { AvailabilityManager } from "@/features/availability/availability-manager";
import { loadAvailability } from "@/features/availability/loaders";
import {
  availabilityWeekHref,
  loadAvailabilityParams,
} from "@/features/availability/search-params";
import { DEFAULT_TIME_ZONE } from "@repo/scheduling";
import { AvailabilityWeekPreview } from "@repo/ui/availability";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { EmptyState, PageHeader } from "@repo/ui/portal-content";
import { formatInTimeZone } from "date-fns-tz";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

export default async function AvailabilityPage({
  searchParams,
}: PageProps<"/dostepnosc">) {
  const { tydzien } = await loadAvailabilityParams(searchParams);
  const model = await loadAvailability(tydzien);

  if (!model) {
    return (
      <div className="space-y-5">
        <PageHeader title="Dostępność" />
        <EmptyState
          title="Brak profilu specjalisty"
          description="Twoje konto nie jest jeszcze powiązane z profilem specjalisty. Skontaktuj się z administratorem centrum."
        />
      </div>
    );
  }

  const today = formatInTimeZone(new Date(), DEFAULT_TIME_ZONE, "yyyy-MM-dd");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dostępność"
        description="Ustal, kiedy i gdzie przyjmujesz. Z tych godzin, bez nieobecności i umówionych wizyt, powstają wolne terminy w rezerwacji online."
      />
      <AvailabilityManager
        model={model}
        preview={
          <Card className="p-5">
            <AvailabilityWeekPreview
              days={model.preview.days}
              navigation={
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-[var(--text-muted)]">
                    Razem: {model.preview.hoursLabel}
                  </span>
                  <Button asChild size="sm" variant="secondary">
                    <Link
                      href={
                        availabilityWeekHref(
                          model.preview.previousWeek,
                        ) as Route
                      }
                      scroll={false}
                    >
                      <ChevronLeft aria-hidden="true" className="size-4" />
                      Poprzedni tydzień
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="secondary">
                    <Link
                      href={
                        availabilityWeekHref(model.preview.nextWeek) as Route
                      }
                      scroll={false}
                    >
                      Następny tydzień
                      <ChevronRight aria-hidden="true" className="size-4" />
                    </Link>
                  </Button>
                </div>
              }
              title={model.preview.title}
            />
          </Card>
        }
        today={today}
      />
    </div>
  );
}
