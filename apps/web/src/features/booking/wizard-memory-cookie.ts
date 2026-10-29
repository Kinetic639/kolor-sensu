// The wizard memory's cookie (#164): written in the browser by the page
// shown, read by the proxy and by "Zmień termin". Choices only, nothing
// personal, so it need not be hidden from scripts.

export const MEMORY_COOKIE = "ks_wybory";
export const MEMORY_MAX_AGE_SECONDS = 24 * 60 * 60;

/** The `document.cookie` line that remembers the choices for a day. */
export function memoryCookie(value: string, secure: boolean) {
  return [
    `${MEMORY_COOKIE}=${encodeURIComponent(value)}`,
    "Path=/umow-wizyte",
    `Max-Age=${MEMORY_MAX_AGE_SECONDS}`,
    "SameSite=Lax",
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}

// Where a booking begun was left (Klient · 1, card 11): the link the
// header's "Dokończ rezerwację" leads to, on every page of the site; the
// wizard's choices, or the step after the time was held. Written by the
// wizard's pages in the browser, cleared once the visit is booked or the
// visitor starts again.
export const RESUME_COOKIE = "ks_rezerwacja";

/** The `document.cookie` line keeping the link for a day, or clearing it. */
export function resumeCookie(href: string | null, secure: boolean) {
  return [
    `${RESUME_COOKIE}=${href ? encodeURIComponent(href) : ""}`,
    "Path=/",
    `Max-Age=${href ? MEMORY_MAX_AGE_SECONDS : 0}`,
    "SameSite=Lax",
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}
