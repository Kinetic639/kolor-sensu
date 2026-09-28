import { describe, expect, it } from "vitest";
import {
  exceptionFormDefaults,
  exceptionFormSchema,
  toRoomExceptionInput,
} from "./exception-form";

const ROOM = "20000000-0000-4000-8000-000000000001";

describe("exceptionFormSchema", () => {
  it("closes a whole day without hours", () => {
    const values = {
      ...exceptionFormDefaults("2030-01-07"),
      reason: " Remont ",
    };
    const parsed = exceptionFormSchema.parse(values);
    expect(toRoomExceptionInput(ROOM, parsed)).toEqual({
      roomId: ROOM,
      date: "2030-01-07",
      type: "closed_all_day",
      startsAt: null,
      endsAt: null,
      reason: "Remont",
    });
  });

  it("blocks hours, with the end after the start", () => {
    const values = {
      ...exceptionFormDefaults("2030-01-07"),
      type: "blocked_interval" as const,
      startsAt: "13:00",
      endsAt: "12:00",
    };
    expect(
      exceptionFormSchema.safeParse(values).error?.issues[0],
    ).toMatchObject({
      path: ["endsAt"],
      message: "Koniec musi być po początku.",
    });
    const parsed = exceptionFormSchema.parse({ ...values, endsAt: "15:00" });
    expect(toRoomExceptionInput(ROOM, parsed)).toMatchObject({
      type: "blocked_interval",
      startsAt: "13:00",
      endsAt: "15:00",
      reason: null,
    });
  });

  it("needs a date", () => {
    expect(
      exceptionFormSchema.safeParse({
        ...exceptionFormDefaults("2030-01-07"),
        date: "",
      }).error?.issues[0]?.message,
    ).toBe("Wybierz datę.");
  });
});
