import { describe, expect, it } from "vitest";
import { formatZonedDateTime } from "./date";

describe("formatZonedDateTime", () => {
  it("formats a UTC instant in the configured timezone", () => {
    expect(
      formatZonedDateTime(
        "2026-01-15T12:00:00.000Z",
        "yyyy-MM-dd HH:mm",
        "Europe/Warsaw",
      ),
    ).toBe("2026-01-15 13:00");
  });
});
