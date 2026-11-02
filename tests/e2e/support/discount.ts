import { expect, type Browser } from "@playwright/test";
import { adminAccount, adminUrl, signIn } from "./target";

// A discount code for one visit, made in the admin portal as the team
// makes one: 20 % off consultations, on, used once at most (so a code left
// behind does nothing more). Its code.
export async function createDiscountCode(browser: Browser): Promise<string> {
  const code = `E2E${Date.now().toString(36).toUpperCase()}`;
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, adminUrl, adminAccount!);
  await page.goto(`${adminUrl}/kody-rabatowe`);
  // With no codes yet the page opens on the new code's form, without the
  // button.
  const form = page.getByRole("region", { name: "Nowy kod rabatowy" });
  const button = page.getByRole("button", { name: "Nowy kod" });
  await expect(form.or(button).first()).toBeVisible();
  if (!(await form.isVisible())) await button.click();
  await form.getByLabel("Kod", { exact: true }).fill(code);
  await form.getByLabel("Rabat (%)").fill("20");
  await form.getByLabel("Limit użyć").fill("1");
  await form.getByLabel("Na co działa").selectOption("consultations");
  await form.getByRole("checkbox", { name: "Kod włączony" }).check();
  await form.getByRole("button", { name: "Zapisz" }).click();
  await expect(page.getByText(code, { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await context.close();
  return code;
}
