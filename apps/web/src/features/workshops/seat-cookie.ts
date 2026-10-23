import { cookies } from "next/headers";

// The guest's key to their held workshop seat, between "Zapisz się" and
// paying: an httpOnly cookie under /warsztaty (never the address, never
// readable by scripts). The database keeps only its hash.

const NAME = "ks_workshop";
// Long enough to fill in the details and pay; the hold itself is shorter.
const MAX_AGE_SECONDS = 60 * 60;

export async function readSeatToken() {
  return (await cookies()).get(NAME)?.value ?? null;
}

export async function saveSeatToken(token: string) {
  (await cookies()).set(NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/warsztaty",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSeatToken() {
  (await cookies()).delete({ name: NAME, path: "/warsztaty" });
}
