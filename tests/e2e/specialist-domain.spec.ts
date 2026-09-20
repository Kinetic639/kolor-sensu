import { expect, test } from "@playwright/test";

const webUrl = "http://localhost:3000";
const unpublishedSlug = process.env.E2E_UNPUBLISHED_SPECIALIST_SLUG;

test("public API returns only active published specialist profiles", async ({
  request,
}) => {
  const response = await request.get(`${webUrl}/api/specialists`);
  expect(response.ok()).toBe(true);

  const specialists = (await response.json()) as Array<Record<string, unknown>>;
  for (const specialist of specialists) {
    expect(specialist.publicationStatus).toBe("published");
    expect(specialist.active).toBe(true);
    expect(specialist).not.toHaveProperty("userId");
    expect(specialist).not.toHaveProperty("reviewComment");
  }

  const published = specialists[0];
  if (published && typeof published.publicSlug === "string") {
    const detailResponse = await request.get(
      `${webUrl}/api/specialists/${published.publicSlug}`,
    );
    expect(detailResponse.ok()).toBe(true);
  }
});

test("an unpublished specialist slug is not exposed", async ({ request }) => {
  test.skip(
    !unpublishedSlug,
    "Set E2E_UNPUBLISHED_SPECIALIST_SLUG for an exact unpublished lookup.",
  );

  const response = await request.get(
    `${webUrl}/api/specialists/${unpublishedSlug}`,
  );
  expect(response.status()).toBe(404);
});
