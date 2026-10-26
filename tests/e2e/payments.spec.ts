import { expect, test, type Page } from "@playwright/test";
import {
  bookUntilPayment,
  expectConfirmed,
  findVisit,
  payButton,
  paymentElement,
} from "./support/booking";
import { adminAccount, adminUrl, missingAccount } from "./support/target";

// The other ways to pay (#178), each through Stripe's test mode on the
// deployed site: a card, a card that asks for 3D Secure, a card the bank
// declines, and Przelewy24. BLIK is booking.spec.ts. Each paid run leaves a
// confirmed test visit behind; the declined one leaves a hold that runs
// out by itself.
//
// They run only with E2E_PAYMENTS=1 (Actions → Staging E2E → Run workflow,
// "payments"), until they have passed against STAGING once; then they join
// every release's run.

test.skip(
  !process.env.E2E_PAYMENTS,
  "The payment tests run with E2E_PAYMENTS=1 (see the top of this file).",
);
// Not retried: with the BLIK test they make the five bookings one browser
// may make in 15 minutes (the hold limit), so a retry would be refused.
test.describe.configure({ mode: "serial", retries: 0 });

// Stripe's test cards (docs.stripe.com/testing).
const CARDS = {
  paid: "4242 4242 4242 4242",
  threeDSecure: "4000 0027 6000 3184",
  declined: "4000 0000 0000 0002",
};

async function payByCard(page: Page, number: string) {
  const payment = paymentElement(page);
  await payment.getByText("Karta", { exact: true }).click();
  await payment.locator('input[name="number"]').fill(number);
  await payment.locator('input[name="expiry"]').fill("12 / 34");
  await payment.locator('input[name="cvc"]').fill("123");
  // Stripe asks for a postal code where the browser seems to be in a
  // country that uses it (CI runs in the US), not in Poland.
  const postalCode = payment.locator('input[name="postalCode"]');
  if (await postalCode.isVisible().catch(() => false)) {
    await postalCode.fill("10001");
  }
  await payButton(page).click();
}

// Stripe's test 3D Secure page opens in frames over ours (nested, their
// names Stripe's own): whichever frame has "Complete", it is clicked, again
// while the page stays (a click before its script is ready does nothing).
async function completeThreeDSecure(page: Page) {
  let clicked = false;
  await expect
    .poll(
      async () => {
        for (const frame of page.frames()) {
          const button = frame.getByRole("button", { name: /^complete$/i });
          if (
            (await button.count()) > 0 &&
            (await button
              .first()
              .isVisible()
              .catch(() => false))
          ) {
            await button
              .first()
              .click({ timeout: 5_000 })
              .catch(() => undefined);
            clicked = true;
            return "open";
          }
        }
        return clicked ? "done" : "waiting";
      },
      {
        timeout: 90_000,
        intervals: [2_000],
        message: "Stripe's 3D Secure page did not open and close",
      },
    )
    .toBe("done");
}

test.beforeEach(() => {
  test.skip(!adminAccount, missingAccount);
  test.setTimeout(240_000);
});

test("a card payment confirms the visit, and the admin sees it", async ({
  page,
  browser,
}) => {
  const reference = await bookUntilPayment(page);
  await payByCard(page, CARDS.paid);
  await expectConfirmed(page, reference);
  await findVisit(browser, adminUrl, adminAccount!, reference);
});

test("a card asking for 3D Secure confirms the visit once approved", async ({
  page,
}) => {
  const reference = await bookUntilPayment(page);
  await payByCard(page, CARDS.threeDSecure);
  await completeThreeDSecure(page);
  await expectConfirmed(page, reference);
});

test("a declined card says so, and the guest can still pay", async ({
  page,
}) => {
  await bookUntilPayment(page);
  await payByCard(page, CARDS.declined);
  await expect(page.getByRole("alert")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Płatność" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Wizyta potwierdzona" }),
  ).toHaveCount(0);
  await expect(payButton(page)).toBeEnabled();
});

test("Przelewy24 confirms the visit after the bank's (test) approval", async ({
  page,
}) => {
  const reference = await bookUntilPayment(page);
  const payment = paymentElement(page);
  await payment.getByText("Przelewy24", { exact: true }).click();
  // The bank to pay through: any, in test mode.
  const bank = payment.getByRole("combobox");
  if ((await bank.count()) > 0) {
    await bank.first().selectOption({ index: 1 });
  }
  // Przelewy24 needs the payer's name, which Stripe is not sent from the
  // details step (only the e-mail and the reference): typed here again.
  await payment
    .getByRole("textbox", { name: "Imię i nazwisko" })
    .fill("Gość E2E");
  await payButton(page).click();
  // Stripe's test page for redirects: approve the payment.
  await page
    .getByRole("link", { name: /authorize test payment/i })
    .or(page.getByRole("button", { name: /authorize test payment/i }))
    .click({ timeout: 60_000 });
  await expectConfirmed(page, reference);
});
