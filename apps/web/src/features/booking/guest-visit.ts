import { getBooking } from "@repo/supabase";
import { getBookingWindow } from "@/lib/public-data";
import { createSecretClient } from "@/lib/supabase/secret";
import type { ChangePolicy } from "./visit-changes";

// A visit by the token from its e-mail link (`/wizyta/<token>`), with the
// centre's time zone and change policy. The token is checked for shape
// first, so nonsense never reaches the database.

const TOKEN = /^[A-Za-z0-9_-]{40,64}$/;

/** The defaults of center_settings, if the settings cannot be read. */
const DEFAULT_POLICY: ChangePolicy = {
  cancellationWindowHours: 48,
  rescheduleWindowHours: 48,
  maxSelfReschedules: 1,
};

export async function visitByLinkToken(token: string) {
  if (!TOKEN.test(token)) return null;
  const booking = await getBooking(createSecretClient(), token).catch(
    (error) => {
      console.error("[booking] reading a visit by link failed:", error);
      return null;
    },
  );
  if (!booking) return null;
  const window = await getBookingWindow();
  return {
    booking,
    timeZone: window?.timeZone ?? "Europe/Warsaw",
    horizonDays: window?.horizonDays ?? 60,
    policy: window ?? DEFAULT_POLICY,
  };
}
