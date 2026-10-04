import { cookies } from "next/headers";
import { intakeCookieValue, readIntakeCookie } from "./intake-gate";

// The visitor's questionnaire, between giving it and saving the visit's
// details: an httpOnly cookie with the service it was for and its token
// (never the answers: those are only in the database). A day long, as the
// database keeps an untied test.

const NAME = "ks_intake";
const MAX_AGE_SECONDS = 24 * 60 * 60;

export async function readIntake() {
  return readIntakeCookie((await cookies()).get(NAME)?.value);
}

export async function saveIntake(serviceSlug: string, token: string) {
  (await cookies()).set(NAME, intakeCookieValue(serviceSlug, token), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/umow-wizyte",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearIntake() {
  (await cookies()).delete({ name: NAME, path: "/umow-wizyte" });
}
