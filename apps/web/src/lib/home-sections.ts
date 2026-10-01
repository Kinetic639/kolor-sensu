import {
  addDays,
  formatDayMonth,
  formatWeekday,
  toFreeSlots,
} from "@repo/scheduling";
import { listFreeSlots } from "@repo/supabase";
import type { PriceNote, SlotPick } from "@repo/ui/public-site";
import { bookingHref } from "@/features/booking/search-params";
import { centreToday } from "@/features/booking/load-wizard";
import { formatDuration } from "@/lib/format";
import { priceRange } from "@/lib/presentation";
import {
  getBookableCatalog,
  getBookingWindow,
  getPriceList,
} from "@/lib/public-data";
import { createPublicClient } from "@/lib/supabase/public";
import { serviceTitle } from "@/lib/site-frame";

// The homepage's booking sections, from live data: the nearest free times
// and the price list in short. Both come back empty when there is nothing
// to show, and the page then leaves the section out.

// list_free_slots takes at most 14 days, both ends included.
const LOOK_AHEAD_DAYS = 14;

const capitalise = (text: string) =>
  text.charAt(0).toLocaleUpperCase("pl-PL") + text.slice(1);

/**
 * The earliest free times of the bookable offers (in the room when the
 * offer has one, else online), soonest first, at most `limit`, never the
 * same specialist twice at the same time.
 */
export async function nearestSlotPicks(limit = 4): Promise<SlotPick[]> {
  const [catalog, window] = await Promise.all([
    getBookableCatalog(),
    getBookingWindow(),
  ]);
  if (!window || catalog.offers.length === 0) return [];
  const from = centreToday(window.timeZone);
  const to = addDays(
    from,
    Math.max(0, Math.min(LOOK_AHEAD_DAYS, window.horizonDays) - 1),
  );
  const client = createPublicClient();

  const found = await Promise.all(
    catalog.offers.map(async (offer) => {
      const online = !offer.supportsInPerson;
      try {
        const rows = await listFreeSlots(client, {
          serviceSlug: offer.serviceSlug,
          specialistSlug: offer.specialistPublicSlug,
          mode: online ? "online" : "in_person",
          from,
          to,
        });
        return toFreeSlots(rows, window.timeZone)
          .filter((one) => one.start.getTime() > Date.now())
          .sort((a, b) => a.start.getTime() - b.start.getTime())
          .slice(0, 3)
          .map((slot) => ({ offer, slot, online }));
      } catch (error) {
        console.error("[home] free slots failed:", error);
        return [];
      }
    }),
  );

  const seen = new Set<string>();
  return found
    .flat()
    .sort((a, b) => a.slot.start.getTime() - b.slot.start.getTime())
    .filter(({ offer, slot }) => {
      const key = `${offer.specialistPublicSlug} ${slot.start.toISOString()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit)
    .map(({ offer, slot, online }) => ({
      href: bookingHref({
        usluga: offer.serviceSlug,
        forma: online ? "online" : "stacjonarnie",
        specjalista: offer.specialistPublicSlug,
        tydzien: slot.date,
        termin: `${slot.date}T${slot.localTime}`,
      }),
      weekday: capitalise(formatWeekday(slot.date)),
      date: formatDayMonth(slot.date),
      time: slot.localTime,
      specialist: offer.specialistName,
      service: serviceTitle({ name: offer.serviceName }),
      mode: online ? "online" : "w gabinecie",
    }));
}

/** Each service once, with its lowest price ("od …" when prices differ). */
export async function priceNotes(): Promise<PriceNote[]> {
  const list = await getPriceList();
  return list.flatMap(({ service, offers }) => {
    if (offers.length === 0) return [];
    const modes = [
      offers.some((offer) => offer.supportsInPerson) ? "w gabinecie" : null,
      offers.some((offer) => offer.supportsOnline) ? "online" : null,
    ]
      .filter(Boolean)
      .join(" lub ");
    return [
      {
        service: serviceTitle(service),
        details: [formatDuration(service.defaultDurationMinutes), modes]
          .filter(Boolean)
          .join(" · "),
        price: priceRange(offers)!,
      },
    ];
  });
}
