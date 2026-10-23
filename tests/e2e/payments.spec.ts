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
test.describe.configure({ mode: "serial" });

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
  await payButton(page).click();
}

// Stripe's test 3D Secure page opens in frames over ours (nested, their
// names Stripe's own): whichever frame has "Complete", it is clicked.
async function completeThreeDSecure(page: Page) {
  await expect
    .poll(
      async () => {
        for (const frame of page.frames()) {
          const button = frame.getByRole("button", { name: /^complete$/i });
          if (
            (await button.count()) > 0 &&
            (await button.first().isVisible())
          ) {
            await button.first().click();
            return true;
          }
        }
        return false;
      },
      { timeout: 60_000, message: "Stripe's 3D Secure page did not open" },
    )
    .toBe(true);
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
  await payButton(page).click();
  // Stripe's test page for redirects: approve the payment.
  await page
    .getByRole("link", { name: /authorize test payment/i })
    .or(page.getByRole("button", { name: /authorize test payment/i }))
    .click({ timeout: 60_000 });
  await expectConfirmed(page, reference);
});
