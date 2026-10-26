import { addDays, toFreeSlots, type FreeSlot } from "@repo/scheduling";
import { listFreeSlots, nextFreeSlot } from "@repo/supabase";
import {
  getBookableCatalog,
  getBookingWindow,
  getLocations,
  getSpecialists,
} from "@/lib/public-data";
import { createPublicClient } from "@/lib/supabase/public";
import type { BookingParams } from "./search-params";
import { resolveBookingSelection } from "./selection";
import { bookingWeek, buildWizardView } from "./wizard";

// Everything the booking page needs for the address it is on. Free times
// are read fresh on every request (never cached): they change with every
// booking. Null when online booking is off or nothing can be booked.

/** Today's date where the centre is. */
export function centreToday(timeZone: string, now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
}

async function weekOfFreeSlots(
  params: BookingParams,
  week: string,
  timeZone: string,
): Promise<FreeSlot[]> {
  try {
    const rows = await listFreeSlots(createPublicClient(), {
      serviceSlug: params.usluga!,
      specialistSlug: params.specjalista!,
      mode: params.forma === "online" ? "online" : "in_person",
      from: week,
      to: addDays(week, 6),
      locationSlug:
        params.forma === "stacjonarnie"
          ? (params.lokalizacja ?? undefined)
          : undefined,
    });
    return toFreeSlots(rows, timeZone);
  } catch (error) {
    console.error("[booking] free slots failed:", error);
    return [];
  }
}

/**
 * The soonest free time from today on within the horizon, or null for
 * none (#203); undefined when it could not be read (the week says only
 * that it is empty).
 */
async function soonestFreeSlot(
  params: BookingParams,
  today: string,
  timeZone: string,
): Promise<FreeSlot | null | undefined> {
  try {
    const startsAt = await nextFreeSlot(createPublicClient(), {
      serviceSlug: params.usluga!,
      specialistSlug: params.specjalista!,
      mode: params.forma === "online" ? "online" : "in_person",
      from: today,
      locationSlug:
        params.forma === "stacjonarnie"
          ? (params.lokalizacja ?? undefined)
          : undefined,
    });
    return startsAt
      ? toFreeSlots([{ starts_at: startsAt, ends_at: startsAt }], timeZone)[0]!
      : null;
  } catch (error) {
    console.error("[booking] the soonest free slot failed:", error);
    return undefined;
  }
}

export async function loadWizard(params: BookingParams) {
  const [catalog, window, locations] = await Promise.all([
    getBookableCatalog(),
    getBookingWindow(),
    getLocations(),
  ]);
  if (!window || catalog.offers.length === 0) return null;

  const selection = resolveBookingSelection(params, {
    services: catalog.services,
    offers: catalog.offers,
    locations,
  });
  // Resolved choices only: a value that does not fit is dropped.
  const resolved: BookingParams = {
    ...params,
    usluga: selection.service?.slug ?? null,
    forma: selection.mode,
    lokalizacja: selection.location?.slug ?? null,
    specjalista: selection.specialist,
  };

  const today = centreToday(window.timeZone);
  const slots =
    selection.step === "termin"
      ? await weekOfFreeSlots(
          resolved,
          bookingWeek(resolved, today),
          window.timeZone,
        )
      : [];
  // An empty week: when the next free time is, or that none is (#203).
  const nextFree =
    selection.step === "termin" && slots.length === 0
      ? await soonestFreeSlot(resolved, today, window.timeZone)
      : undefined;
  const photos =
    selection.step === "specjalista"
      ? new Map(
          (await getSpecialists()).flatMap((specialist) =>
            specialist.photoUrl
              ? [[specialist.publicSlug, specialist.photoUrl] as const]
              : [],
          ),
        )
      : new Map<string, string>();

  return {
    params: resolved,
    selection,
    window,
    view: buildWizardView({
      params: resolved,
      selection,
      offers: catalog.offers,
      photos,
      today,
      horizonDays: window.horizonDays,
      slots,
      nextFree,
    }),
  };
}
