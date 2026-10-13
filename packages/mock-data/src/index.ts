import type { Service } from "@repo/contracts";

export const sampleService = {
  id: "sample-service",
  name: "Sample service",
  slug: "sample-service",
  shortDescription: null,
  description: null,
  category: "other",
  defaultDurationMinutes: 50,
  afterMinutes: 10,
  active: true,
  publiclyVisible: true,
  bookingEnabled: false,
  requiresIntake: false,
  sortOrder: 0,
  catalogId: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
} satisfies Service;
