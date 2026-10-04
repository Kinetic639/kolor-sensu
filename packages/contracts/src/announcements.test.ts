import { describe, expect, it } from "vitest";
import {
  announcementInputSchema,
  announcementState,
  announcementDates,
} from "./announcements";

const valid = {
  message: "W dniach 19–23 grudnia centrum jest nieczynne.",
  linkLabel: null,
  linkHref: null,
  startsOn: "2026-12-10",
  endsOn: "2026-12-23",
};

describe("announcementInputSchema", () => {
  it("a message, shown from one day to another", () => {
    expect(announcementInputSchema.safeParse(valid).success).toBe(true);
  });

  it("short: a narrow bar, not a page", () => {
    expect(
      announcementInputSchema.safeParse({ ...valid, message: "x".repeat(201) })
        .success,
    ).toBe(false);
    expect(
      announcementInputSchema.safeParse({ ...valid, message: "  " }).success,
    ).toBe(false);
  });

  it("not ending before it starts", () => {
    const result = announcementInputSchema.safeParse({
      ...valid,
      endsOn: "2026-12-01",
    });
    expect(result.success).toBe(false);
    expect(result.error!.issues[0]!.path).toEqual(["endsOn"]);
  });

  it("a link with both its words and its address, a page here or https", () => {
    expect(
      announcementInputSchema.safeParse({
        ...valid,
        linkLabel: "Szczegóły",
        linkHref: "/kontakt",
      }).success,
    ).toBe(true);
    expect(
      announcementInputSchema.safeParse({
        ...valid,
        linkLabel: "Szczegóły",
        linkHref: null,
      }).success,
    ).toBe(false);
    expect(
      announcementInputSchema.safeParse({
        ...valid,
        linkLabel: "Szczegóły",
        linkHref: "javascript:alert(1)",
      }).success,
    ).toBe(false);
  });

  it("empty link fields are no link", () => {
    expect(
      announcementInputSchema.parse({ ...valid, linkLabel: " ", linkHref: "" }),
    ).toMatchObject({ linkLabel: null, linkHref: null });
  });
});

describe("announcementState", () => {
  const dates = { startsOn: "2026-12-10", endsOn: "2026-12-23" };
  it("before, on and after its days", () => {
    expect(announcementState(dates, "2026-12-09")).toBe("scheduled");
    expect(announcementState(dates, "2026-12-10")).toBe("current");
    expect(announcementState(dates, "2026-12-23")).toBe("current");
    expect(announcementState(dates, "2026-12-24")).toBe("past");
  });
});

describe("announcementDates", () => {
  it("its days, short", () => {
    expect(
      announcementDates({ startsOn: "2026-12-10", endsOn: "2026-12-23" }),
    ).toBe("10.12–23.12.2026");
    expect(
      announcementDates({ startsOn: "2026-12-24", endsOn: "2026-12-24" }),
    ).toBe("24.12.2026");
    expect(
      announcementDates({ startsOn: "2026-12-28", endsOn: "2027-01-03" }),
    ).toBe("28.12.2026–03.01.2027");
  });
});
