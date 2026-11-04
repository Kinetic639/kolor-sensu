// The specs that only look: they open pages and the public API, check
// links, axe and the keyboard, and send nothing that is kept (the contact
// form only with a wrong address, the newsletter's pages with a broken
// link). Only these run against STAGING (E2E_TARGET=staging), the client's
// environment without test data, after each release.
//
// Before adding a spec here, or a test to one of these: it must not book,
// sign up, sign in, save a questionnaire or send a message.
export const READ_ONLY_SPECS = [
  "about-pages.spec.ts",
  "auth.spec.ts",
  "center-settings-domain.spec.ts",
  "cookie-consent.spec.ts",
  "crisis-help.spec.ts",
  "education-pages.spec.ts",
  "home.spec.ts",
  "keyboard-zoom.spec.ts",
  "legal-pages.spec.ts",
  "navigation.spec.ts",
  "newsletter-pages.spec.ts",
  "offer-pages.spec.ts",
  "services-domain.spec.ts",
  "specialist-domain.spec.ts",
];
