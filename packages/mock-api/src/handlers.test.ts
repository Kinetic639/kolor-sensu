import { sampleService } from "@repo/mock-data";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mockServer } from "./server.js";

beforeAll(() => mockServer.listen({ onUnhandledRequest: "error" }));
afterAll(() => mockServer.close());

describe("mock API handlers", () => {
  it("serves canonical fixtures through the transport layer", async () => {
    const response = await fetch("http://localhost/api/__mock/services");

    await expect(response.json()).resolves.toEqual([sampleService]);
  });
});
