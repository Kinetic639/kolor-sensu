// E2E_BYPASS_KEY in the header the site looks for (E2E_KEY_HEADER in
// apps/web/src/features/booking/guards.ts), when the run has it: from the
// root .env.local, or the CI secrets.
export function e2eHeaders(): Record<string, string> {
  const key = process.env.E2E_BYPASS_KEY;
  return key ? { "x-e2e-key": key } : {};
}
