import { describe, expect, it } from "vitest";
import {
  intakeCookieValue,
  readIntakeCookie,
  sendToIntake,
} from "./intake-gate";

const intakeSlugs = new Set(["konsultacja-psychologiczna"]);

describe("sendToIntake", () => {
  it("a service that asks for it, chosen and past: to the test first", () => {
    expect(
      sendToIntake({
        serviceSlug: "konsultacja-psychologiczna",
        intakeSlugs,
        intakeFor: null,
        stepIndex: 1,
      }),
    ).toBe(true);
  });

  it("its test done: on with the booking", () => {
    expect(
      sendToIntake({
        serviceSlug: "konsultacja-psychologiczna",
        intakeSlugs,
        intakeFor: "konsultacja-psychologiczna",
        stepIndex: 2,
      }),
    ).toBe(false);
  });

  it("a test done for another service does not count", () => {
    expect(
      sendToIntake({
        serviceSlug: "konsultacja-psychologiczna",
        intakeSlugs,
        intakeFor: "terapia-dla-par",
        stepIndex: 1,
      }),
    ).toBe(true);
  });

  it("other services, or no service yet: no test", () => {
    expect(
      sendToIntake({
        serviceSlug: "terapia-dla-par",
        intakeSlugs,
        intakeFor: null,
        stepIndex: 1,
      }),
    ).toBe(false);
    expect(
      sendToIntake({
        serviceSlug: null,
        intakeSlugs,
        intakeFor: null,
        stepIndex: 0,
      }),
    ).toBe(false);
  });
});

describe("the intake cookie", () => {
  it("holds the service it is for and its token", () => {
    const value = intakeCookieValue(
      "konsultacja-psychologiczna",
      "abc_DEF-123abc_DEF-123abc_DEF-12",
    );
    expect(readIntakeCookie(value)).toEqual({
      serviceSlug: "konsultacja-psychologiczna",
      token: "abc_DEF-123abc_DEF-123abc_DEF-12",
    });
  });

  it("anything else reads as none", () => {
    expect(readIntakeCookie(undefined)).toBeNull();
    expect(readIntakeCookie("garbage")).toBeNull();
    expect(readIntakeCookie("Bad Slug:token")).toBeNull();
  });
});
