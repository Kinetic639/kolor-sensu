import { describe, expect, it } from "vitest";
import { isUnsubscribeCode, maskEmail } from "./unsubscribe-code";

describe("the unsubscribe link's code", () => {
  it("takes only a whole id", () => {
    expect(isUnsubscribeCode("8f14e45f-ceea-4e7a-9d8b-0c3e5f2a1b7d")).toBe(
      true,
    );
    expect(isUnsubscribeCode("")).toBe(false);
    // An issue sent before the contact had its code.
    expect(isUnsubscribeCode("{{{contact.unsubscribe_token}}}")).toBe(false);
    expect(isUnsubscribeCode("8f14e45f")).toBe(false);
  });

  it("masks the address it names", () => {
    expect(maskEmail("ola.nowak@example.invalid")).toBe("o…@example.invalid");
    expect(maskEmail("broken")).toBe("…");
  });
});
