import "server-only";

import { localDate } from "@/features/dashboard/loaders";
import { getCurrentPortalAuthorization } from "@/lib/auth";
import { listPortalUsers } from "@repo/supabase/access";
import { createClient } from "@/lib/supabase/server";
import { missingHolidays } from "@repo/contracts/closures";
import { listClosures, visitsOnDays } from "@repo/supabase/closures";
import { closureRows } from "./closures-view";
import {
  getCenterPublicProfile,
  getCenterSettings,
  listLocations,
  retentionPreview,
} from "@repo/supabase";

export async function loadCenterSettings() {
  const client = await createClient();
  const [profile, locations, settings] = await Promise.all([
    getCenterPublicProfile(client),
    listLocations(client),
    getCenterSettings(client),
  ]);
  return {
    profile,
    locations,
    settings,
    company: {
      legalName: settings.legalName,
      taxId: settings.taxId,
      regon: settings.regon,
      registeredAddress: settings.registeredAddress,
    },
  };
}

/**
 * Dni zamknięcia: the closures as the list shows them (with the visits
 * still booked on those to come), today in the centre's time and the
 * public holidays not closed yet, this year's and the next.
 */
export async function loadClosures() {
  const client = await createClient();
  const [closures, settings] = await Promise.all([
    listClosures(client),
    getCenterSettings(client),
  ]);
  const today = localDate(new Date(), settings.timezone);
  const ahead = closures.filter((closure) => closure.endsOn >= today);
  const visits = Object.fromEntries(
    await Promise.all(
      ahead.map(
        async (closure) =>
          [
            closure.id,
            await visitsOnDays(client, closure.startsOn, closure.endsOn),
          ] as const,
      ),
    ),
  );
  const year = Number(today.slice(0, 4));
  return {
    today,
    rows: closureRows(closures, today, visits),
    holidays: [year, year + 1].map((one) => ({
      year: one,
      missing: missingHolidays(one, closures, today).length,
    })),
  };
}

/** Dostęp: every portal user and who is asking (their own row). */
export async function loadAccess() {
  const [client, authorization] = await Promise.all([
    createClient(),
    getCurrentPortalAuthorization(),
  ]);
  return {
    users: await listPortalUsers(client),
    me: authorization.user?.id ?? null,
  };
}

/** Dane osobowe: the periods set, and what the next night removes. */
export async function loadRetention() {
  const client = await createClient();
  const [settings, preview] = await Promise.all([
    getCenterSettings(client),
    retentionPreview(client),
  ]);
  return { settings, preview };
}
