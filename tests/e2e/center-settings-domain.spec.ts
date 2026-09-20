import { expect, test } from "@playwright/test";

const webUrl = "http://localhost:3000";

test("public center API exposes only safe published fields", async ({
  request,
}) => {
  const response = await request.get(`${webUrl}/api/center`);
  expect(response.ok() || response.status() === 404).toBe(true);

  if (response.ok()) {
    const profile = (await response.json()) as Record<string, unknown>;
    expect(profile).not.toHaveProperty("published");
    expect(profile).not.toHaveProperty("id");
    expect(profile).not.toHaveProperty("createdAt");
    expect(profile).not.toHaveProperty("updatedAt");
  }
});

test("public locations API returns only public active locations", async ({
  request,
}) => {
  const response = await request.get(`${webUrl}/api/locations`);
  expect(response.ok()).toBe(true);

  const locations = (await response.json()) as Array<Record<string, unknown>>;
  for (const location of locations) {
    expect(location).not.toHaveProperty("active");
    expect(location).not.toHaveProperty("publiclyVisible");
    expect(location).not.toHaveProperty("createdAt");
    expect(location).not.toHaveProperty("updatedAt");
  }
});
