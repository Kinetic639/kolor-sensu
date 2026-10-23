import { describe, expect, it } from "vitest";
import { cancellingAnswer } from "./cancelling-answer";

describe("Kontakt's answer on cancelling a visit", () => {
  it("says the settings' hours", () => {
    expect(
      cancellingAnswer({
        cancellationWindowHours: 48,
        rescheduleWindowHours: 24,
        maxSelfReschedules: 2,
      }).answer,
    ).toBe(
      "Wizytę odwołasz z pełnym zwrotem opłaty najpóźniej 48 godz. przed jej początkiem, a termin zmienisz najpóźniej 24 godz. przed nią: na stronie wizyty (link jest w e-mailu z potwierdzeniem), telefonicznie albo mailowo.",
    );
  });

  it("promises no moving when the client may not move a visit", () => {
    const { answer } = cancellingAnswer({
      cancellationWindowHours: 72,
      rescheduleWindowHours: 24,
      maxSelfReschedules: 0,
    });
    expect(answer).toContain("najpóźniej 72 godz.");
    expect(answer).not.toContain("termin zmienisz");
  });
});
