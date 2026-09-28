import { describe, expect, it, vi } from "vitest";
import {
  AvailabilityError,
  addTimeOff,
  availabilityMappers,
  deleteAvailabilityRule,
  parseTstzRange,
  saveAvailabilityRule,
} from "./availability";

const ROOM = "20000000-0000-4000-8000-000000000001";

const input = {
  recurrence: "weekly" as const,
  weekday: 1,
  startsAt: "09:00",
  endsAt: "13:00",
  validFrom: "2030-01-07",
  validUntil: null,
  mode: "in_person" as const,
  roomId: ROOM,
  note: " Pierwszorazowi do 11:00 ",
};

describe("availability mapping", () => {
  it("maps a rule and shortens times to HH:MM", () => {
    expect(
      availabilityMappers.rule({
        id: "rule",
        specialist_id: "specialist",
        recurrence: "biweekly",
        weekday: 4,
        starts_at: "09:00:00",
        ends_at: "12:30:00",
        valid_from: "2030-01-07",
        valid_until: null,
        mode: "hybrid",
        room_id: ROOM,
        note: null,
        created_at: "",
        updated_at: "",
      }),
    ).toEqual({
      id: "rule",
      specialistId: "specialist",
      recurrence: "biweekly",
      weekday: 4,
      startsAt: "09:00",
      endsAt: "12:30",
      validFrom: "2030-01-07",
      validUntil: null,
      mode: "hybrid",
      roomId: ROOM,
      note: null,
    });
  });

  it("reads a Postgres time range as instants", () => {
    expect(
      parseTstzRange('["2030-01-06 23:00:00+00","2030-01-13 23:00:00+00")'),
    ).toEqual({
      start: new Date("2030-01-06T23:00:00Z"),
      end: new Date("2030-01-13T23:00:00Z"),
    });
    expect(
      parseTstzRange("[2030-01-07T09:00:00+01:00,2030-01-07T11:00:00+01:00)"),
    ).toEqual({
      start: new Date("2030-01-07T08:00:00Z"),
      end: new Date("2030-01-07T10:00:00Z"),
    });
  });
});

describe("saveAvailabilityRule", () => {
  it("sends the validated window to the database function", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "rule-id", error: null });
    const id = await saveAvailabilityRule({ rpc } as never, input);

    expect(rpc).toHaveBeenCalledWith("save_availability_rule", {
      p_recurrence: "weekly",
      p_weekday: 1,
      p_starts_at: "09:00",
      p_ends_at: "13:00",
      p_valid_from: "2030-01-07",
      p_mode: "in_person",
      p_room_id: ROOM,
      p_note: "Pierwszorazowi do 11:00",
    });
    expect(id).toBe("rule-id");
  });

  it("passes the window and the specialist when given", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "rule-id", error: null });
    await saveAvailabilityRule(
      { rpc } as never,
      { ...input, mode: "online", validUntil: "2030-06-30", note: null },
      { id: "rule-id", specialistId: "specialist" },
    );

    expect(rpc).toHaveBeenCalledWith("save_availability_rule", {
      p_recurrence: "weekly",
      p_weekday: 1,
      p_starts_at: "09:00",
      p_ends_at: "13:00",
      p_valid_from: "2030-01-07",
      p_valid_until: "2030-06-30",
      p_mode: "online",
      p_id: "rule-id",
      p_specialist_id: "specialist",
    });
  });

  it("rejects invalid input before calling the database", async () => {
    const rpc = vi.fn();
    await expect(
      saveAvailabilityRule({ rpc } as never, { ...input, roomId: null }),
    ).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    [{ code: "23P01", hint: "overlap" }, "overlap"],
    [{ code: "23P01", hint: "room_taken" }, "room_taken"],
    [{ code: "22023", hint: null }, "room_unavailable"],
    [{ code: "P0002", hint: null }, "not_found"],
    [{ code: "42501", hint: null }, "forbidden"],
  ])("explains a refusal: %o → %s", async (error, reason) => {
    const rpc = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: "x", ...error } });
    const promise = saveAvailabilityRule({ rpc } as never, input);
    await expect(promise).rejects.toBeInstanceOf(AvailabilityError);
    await expect(promise).rejects.toMatchObject({ reason });
  });
});

describe("deleteAvailabilityRule", () => {
  it("removes a window by id", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    await deleteAvailabilityRule({ rpc } as never, "rule-id");
    expect(rpc).toHaveBeenCalledWith("delete_availability_rule", {
      p_id: "rule-id",
    });
  });
});

describe("addTimeOff", () => {
  it("sends instants and reports an overlap", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: "off-id", error: null })
      .mockResolvedValueOnce({
        data: null,
        error: { code: "23P01", hint: null, message: "x" },
      });
    const interval = {
      start: new Date("2030-01-06T23:00:00Z"),
      end: new Date("2030-01-13T23:00:00Z"),
      reason: "Urlop",
    };

    expect(await addTimeOff({ rpc } as never, interval)).toBe("off-id");
    expect(rpc).toHaveBeenCalledWith("add_time_off", {
      p_starts_at: "2030-01-06T23:00:00.000Z",
      p_ends_at: "2030-01-13T23:00:00.000Z",
      p_reason: "Urlop",
    });
    await expect(addTimeOff({ rpc } as never, interval)).rejects.toMatchObject({
      reason: "time_off_overlap",
    });
  });
});
