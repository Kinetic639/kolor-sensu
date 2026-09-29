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
