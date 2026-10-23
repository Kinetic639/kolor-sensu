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
