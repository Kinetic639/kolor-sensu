import { AvailabilityError } from "@repo/supabase";
import { describe, expect, it } from "vitest";
import { availabilityErrorMessage, isStaleRefusal } from "./messages";

describe("availabilityErrorMessage", () => {
  it("says who has a taken room and when", () => {
    expect(
      availabilityErrorMessage(
        new AvailabilityError("room_taken", {
          specialistName: "Anna Nowak",
          date: "2030-01-08",
          startsAt: "13:00",
          endsAt: "16:00",
        }),
      ),
    ).toBe(
      "Gabinet jest już zajęty: Anna Nowak, 8 stycznia 2030 (wtorek), 13:00–16:00. Wybierz inny gabinet albo inne godziny, lub umów się z tą osobą na zamianę.",
    );
  });

  it("explains a taken room without details", () => {
    expect(
      availabilityErrorMessage(new AvailabilityError("room_taken")),
    ).toMatch(/zajęty przez innego specjalistę/);
  });

  it("explains other refusals and unknown errors", () => {
    expect(
      availabilityErrorMessage(new AvailabilityError("room_closed")),
    ).toMatch(/zamknięty/);
    expect(availabilityErrorMessage(new AvailabilityError("off_grid"))).toBe(
      "Godziny dostępności zaczynają się i kończą o pełnej godzinie, tak jak terminy wizyt. Wybierz je z listy.",
    );
    expect(availabilityErrorMessage(new Error("boom"))).toBe(
      "Nie udało się zapisać. Spróbuj ponownie.",
    );
  });
});

describe("isStaleRefusal", () => {
  it("is true when the page's data is out of date", () => {
    expect(isStaleRefusal(new AvailabilityError("room_taken"))).toBe(true);
    expect(isStaleRefusal(new AvailabilityError("overlap"))).toBe(true);
    expect(isStaleRefusal(new AvailabilityError("not_found"))).toBe(true);
    expect(isStaleRefusal(new AvailabilityError("room_unavailable"))).toBe(
      true,
    );
  });

  it("is false for mistakes in the form", () => {
    expect(isStaleRefusal(new AvailabilityError("room_closed"))).toBe(false);
    expect(isStaleRefusal(new AvailabilityError("forbidden"))).toBe(false);
    expect(isStaleRefusal(new Error("boom"))).toBe(false);
  });
});
