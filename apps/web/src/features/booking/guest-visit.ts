import { getBooking } from "@repo/supabase";
import { getBookingWindow } from "@/lib/public-data";
import { createSecretClient } from "@/lib/supabase/secret";

// A visit by the token from its e-mail link (`/wizyta/<token>`). The token
// is checked for shape first, so nonsense never reaches the database.

const TOKEN = /^[A-Za-z0-9_-]{40,64}$/;

export async function visitByLinkToken(token: string) {
  if (!TOKEN.test(token)) return null;
  const booking = await getBooking(createSecretClient(), token).catch(
    (error) => {
      console.error("[booking] reading a visit by link failed:", error);
      return null;
    },
  );
  if (!booking) return null;
  const timeZone = (await getBookingWindow())?.timeZone ?? "Europe/Warsaw";
  return { booking, timeZone };
}
