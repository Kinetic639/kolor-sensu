import type { Service } from "@repo/contracts";

export const sampleService = {
  id: "sample-service",
  name: "Sample service",
  slug: "sample-service",
  shortDescription: null,
  description: null,
  category: "other",
  defaultDurationMinutes: 50,
  active: true,
  publiclyVisible: true,
  bookingEnabled: false,
  sortOrder: 0,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
} satisfies Service;
