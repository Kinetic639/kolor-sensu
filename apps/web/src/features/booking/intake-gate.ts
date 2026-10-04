// The questionnaire before a first consultation, as the wizard keeps to
// it: a service that asks for it, once chosen, sends the visitor to the
// test before anything else; a test done (for that same service) lets the
// booking go on. The visitor's cookie holds which service the test was
// done for and its token (the answers themselves are only in the
// database). Pure, so it is tested without a request.

export function sendToIntake({
  serviceSlug,
  intakeSlugs,
  intakeFor,
  stepIndex,
}: {
  /** The chosen service. */
  serviceSlug: string | null;
  /** The services that ask for the test. */
  intakeSlugs: ReadonlySet<string>;
  /** The service the visitor's test was done for, if any. */
  intakeFor: string | null;
  /** The wizard's step (0: choosing the service). */
  stepIndex: number;
}) {
  return (
    serviceSlug !== null &&
    stepIndex > 0 &&
    intakeSlugs.has(serviceSlug) &&
    intakeFor !== serviceSlug
  );
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TOKEN = /^[A-Za-z0-9_-]{16,}$/;

/** `<service slug>:<token>` */
export function intakeCookieValue(serviceSlug: string, token: string) {
  return `${serviceSlug}:${token}`;
}

export function readIntakeCookie(value: string | undefined) {
  if (!value) return null;
  const [serviceSlug, token, ...rest] = value.split(":");
  if (
    rest.length ||
    !serviceSlug ||
    !token ||
    !SLUG.test(serviceSlug) ||
    !TOKEN.test(token)
  ) {
    return null;
  }
  return { serviceSlug, token };
}
