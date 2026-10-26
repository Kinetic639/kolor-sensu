import { expect, test } from "@playwright/test";
import {
  bookUntilDetails,
  expectConfirmed,
  payButton,
  payWithBlik,
} from "./support/booking";
import { createDiscountCode } from "./support/discount";
import {
  emailTo,
  missingResendKey,
  resendKey,
  visitLinkFromEmail,
} from "./support/mail";
import { adminAccount, missingAccount } from "./support/target";

// A visit's own page, reached as the guest reaches it, by the link in the
// e-mail (read back from Resend: ./support/mail.ts): paying later, then
// moving and cancelling with a full refund (#178). Payments are Stripe's
// test mode (BLIK code 123456). Each run makes two bookings and leaves a
// paid test visit and a cancelled one behind.

test.beforeEach(() => {
  test.skip(!resendKey, missingResendKey);
  test.setTimeout(300_000);
});

test("a guest books with a discount code to pay later and pays the lower price from the e-mail's link", async ({
  page,
  browser,
}) => {
  test.skip(!adminAccount, missingAccount);
  const code = await createDiscountCode(browser);
  const { reference, email, details } = await bookUntilDetails(page, {
    code,
  });
  await details
    .getByRole("button", { name: "Zarezerwuj, zapłacę później" })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Sprawdź skrzynkę e-mail" }),
  ).toBeVisible({ timeout: 30_000 });

  // The address is checked first: the link, then "Potwierdzam rezerwację".
  await page.goto(await visitLinkFromEmail(email, reference));
  await expect(
    page.getByRole("heading", { name: "Potwierdź swoją rezerwację" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Potwierdzam rezerwację" }).click();
  await expect(
    page.getByRole("heading", { name: "Twoja wizyta czeka na płatność" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Zapłać za wizytę" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Płatność za wizytę" }),
  ).toBeVisible();
  // The test service's 150 zł, less the code's 20 %.
  await page.getByRole("button", { name: /^Przejdź do płatności/ }).click();
  await expect(payButton(page)).toHaveText(/^Zapłać 120/, { timeout: 30_000 });
  await payWithBlik(page);
  // Back on the link: the visit, or, once its confirmation e-mail has
  // given it a new link, the payment taken (#259); never "no such page".
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /^(Twoja wizyta jest potwierdzona|Płatność przyjęta)$/,
    }),
  ).toBeVisible({ timeout: 90_000 });
  await emailTo(email, `Potwierdzenie wizyty ${reference}`);
});

test("a guest moves a paid visit, then cancels it with a full refund", async ({
  page,
}) => {
  const { reference, email, details } = await bookUntilDetails(page);
  await details.getByRole("button", { name: "Zapłać teraz" }).click();
  await expect(page.getByRole("heading", { name: "Płatność" })).toBeVisible({
    timeout: 30_000,
  });
  await payWithBlik(page);
  await expectConfirmed(page, reference);

  // Moving: another free time of the same specialist.
  const link = await visitLinkFromEmail(
    email,
    `Potwierdzenie wizyty ${reference}`,
  );
  await page.goto(link);
  await page.getByRole("link", { name: "Przełóż wizytę" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Wybierz nowy termin" }),
  ).toBeVisible();
  const step = page.getByRole("main");
  for (let week = 0; week < 8; week += 1) {
    const slots = step.getByRole("link", { name: /, \d{2}:\d{2}$/ });
    if ((await slots.count()) > 0) {
      await slots.last().click();
      break;
    }
    const before = page.url();
    await step.getByRole("link", { name: "Następny tydzień" }).click();
    await page.waitForURL((url) => url.href !== before);
  }
  await page.getByRole("button", { name: "Przełóż na ten termin" }).click();
  await expect(
    page.getByText(
      "Wizyta została przełożona. Wysłaliśmy e-mail z nowym terminem.",
    ),
  ).toBeVisible({ timeout: 30_000 });

  // Cancelling, days ahead: the whole price back through Stripe.
  await page.getByRole("link", { name: "Odwołaj wizytę" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Odwołać wizytę?" }),
  ).toBeVisible();
  await expect(page.getByText(/^Otrzymasz pełny zwrot/)).toBeVisible();
  await page.getByRole("button", { name: "Tak, odwołuję wizytę" }).click();
  await expect(
    page.getByText(
      "Wizyta została odwołana. Wysłaliśmy potwierdzenie e-mailem.",
    ),
  ).toBeVisible({ timeout: 30_000 });
  // The refund went through Stripe before the e-mail, which says so.
  const cancelled = await emailTo(
    email,
    `Wizyta ${reference} została odwołana`,
  );
  expect(cancelled).toContain("Zwrócimy 150");
});
