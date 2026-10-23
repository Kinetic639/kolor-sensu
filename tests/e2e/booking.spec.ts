import { test } from "@playwright/test";
import {
  bookUntilPayment,
  expectConfirmed,
  findVisit,
  payButton,
  paymentElement,
} from "./support/booking";
import {
  adminAccount,
  adminUrl,
  missingAccount,
  specialistAccount,
  specialistUrl,
} from "./support/target";

// A guest books, pays with BLIK and the visit shows up in both portals:
// the path every release must keep working (the wizard's needs:
// ./support/booking.ts). Payments are Stripe's test mode (BLIK code
// 123456) and Turnstile uses its always-pass test keys there. Each run
// leaves one confirmed test visit behind.

test("a guest books a visit, pays with BLIK and both portals show it", async ({
  page,
  browser,
}) => {
  test.skip(!adminAccount || !specialistAccount, missingAccount);
  test.setTimeout(240_000);

  const reference = await bookUntilPayment(page);
  const payment = paymentElement(page);
  await payment.getByText("BLIK", { exact: true }).click();
  await payment.getByLabel("Kod BLIK").fill("123456");
  await payButton(page).click();
  await expectConfirmed(page, reference);

  await findVisit(browser, adminUrl, adminAccount!, reference);
  await findVisit(browser, specialistUrl, specialistAccount!, reference);
});
