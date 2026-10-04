import "server-only";

import {
  centreSettings,
  serviceCatalogs,
  services as loadServices,
  specialistAvatars,
  specialistSummaries,
} from "@/lib/reference-data";
import { createClient } from "@/lib/supabase/server";
import { addDays, mondayOf, serviceWeeks } from "@repo/scheduling";
import { listSpecialistOffersAdmin, searchAllVisits } from "@repo/supabase";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { mapSpecialistsListViewModel } from "../specialists/view-model";
import { toServiceRows } from "./view-model";

// The offer (Oferta): every service with who offers it at what price and
// the week asked for (its visits day by day, the next ones), read at once
// for all of them: the offers and the visits (the week's and those to
// come); the services, the team and their pictures come from the kept
// reference data.

/** How far ahead the next visits are looked for. */
const AHEAD_DAYS = 28;

const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

/** The services' rows for the week asked for (any of its days; none: this one). */
export async function loadServicesRoster(day: string | null = null) {
  const client = await createClient();
  const [
    { timezone: timeZone },
    services,
    catalogs,
    summaries,
    avatars,
    offers,
  ] = await Promise.all([
    centreSettings(),
    loadServices(),
    serviceCatalogs(),
    specialistSummaries(),
    specialistAvatars(),
    listSpecialistOffersAdmin(client),
  ]);
  const now = new Date();
  const today = formatInTimeZone(now, timeZone, "yyyy-MM-dd");
  const thisWeek = mondayOf(today);
  const week = day ? mondayOf(day) : thisWeek;
  const ahead = addDays(today, AHEAD_DAYS);
  const sunday = addDays(week, 6);
  // The search gives each visit's service (the calendar's list does not).
  const midnight = (date: string) =>
    fromZonedTime(`${date}T00:00:00`, timeZone).toISOString();
  const visits = await searchAllVisits(client, {
    statuses: ["confirmed", "awaiting_payment"],
    from: midnight(week < today ? week : today),
    to: midnight(addDays(ahead > sunday ? ahead : sunday, 1)),
  });
  // The pictures kept between requests, by the published photo's path.
  const photos = new Map(
    summaries.flatMap((one) =>
      one.publicProfilePhotoUrl && avatars[one.id]
        ? [[one.publicProfilePhotoUrl, avatars[one.id]!] as const]
        : [],
    ),
  );
  const rows = toServiceRows({
    services,
    catalogs,
    offers,
    people: mapSpecialistsListViewModel(summaries, photos).items,
    weeks: serviceWeeks({ timeZone, now, week, visits }),
    week,
    today,
    webUrl,
  });
  // The arrangement's editor works on every service and catalogue.
  return { rows, week, thisWeek, services, catalogs };
}

/** A service's page: its row, the full service, the others (the switcher). */
export async function loadServicePage(id: string) {
  const [{ rows }, services] = await Promise.all([
    loadServicesRoster(),
    loadServices(),
  ]);
  const row = rows.find((one) => one.id === id);
  const service = services.find((one) => one.id === id);
  return row && service ? { row, service, rows } : null;
}

/** Its name, for the breadcrumb (kept between requests). */
export async function serviceName(id: string) {
  const services = await loadServices();
  return services.find((one) => one.id === id)?.name ?? null;
}
