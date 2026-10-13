import { expect, test } from "@playwright/test";
import { webUrl } from "./support/target";

test("public services API exposes only safe catalog fields", async ({
  request,
}) => {
  const response = await request.get(`${webUrl}/api/services`);
  expect(response.ok()).toBe(true);

  const services = (await response.json()) as Array<Record<string, unknown>>;
  for (const service of services) {
    expect(service).not.toHaveProperty("active");
    expect(service).not.toHaveProperty("publiclyVisible");
    expect(service).not.toHaveProperty("bookingEnabled");
    // sortOrder and catalogId stay: the site's menu is arranged by them.
    expect(service).not.toHaveProperty("createdAt");
    expect(service).not.toHaveProperty("updatedAt");
  }
});

test("a non-existent service slug is not exposed", async ({ request }) => {
  const response = await request.get(
    `${webUrl}/api/services/definitely-not-a-real-service`,
  );
  expect(response.status()).toBe(404);
});

test("public specialist offers API exposes only safe offer fields", async ({
  request,
}) => {
  const response = await request.get(
    `${webUrl}/api/services/definitely-not-a-real-service/offers`,
  );
  expect(response.ok()).toBe(true);

  const offers = (await response.json()) as Array<Record<string, unknown>>;
  expect(offers).toEqual([]);
  for (const offer of offers) {
    expect(offer).not.toHaveProperty("specialistId");
    expect(offer).not.toHaveProperty("active");
    expect(offer).not.toHaveProperty("id");
  }
});
