import { cookies } from "next/headers";

// The guest's key to their held visit, between choosing a time and paying:
// an httpOnly cookie (never the address, never readable by scripts). The
// database keeps only its hash.

const NAME = "ks_booking";
// Long enough to fill in the details and pay; the hold itself is shorter.
const MAX_AGE_SECONDS = 60 * 60;

export async function readHoldToken() {
  return (await cookies()).get(NAME)?.value ?? null;
}

export async function saveHoldToken(token: string) {
  (await cookies()).set(NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/umow-wizyte",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearHoldToken() {
  (await cookies()).delete({ name: NAME, path: "/umow-wizyte" });
}

// The hold given back for another time ("Zmień termin", or a time chosen
// again): its token, for an hour, so the details given for it are filled
// in for the new time. Its visit stays given back; only its details are
// read again, by the same secret.
const FORMER = "ks_booking_former";

export async function readFormerHoldToken() {
  return (await cookies()).get(FORMER)?.value ?? null;
}

export async function saveFormerHoldToken(token: string) {
  (await cookies()).set(FORMER, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/umow-wizyte",
    maxAge: MAX_AGE_SECONDS,
  });
}
