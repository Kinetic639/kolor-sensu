import { describe, expect, it, vi } from "vitest";
import {
  AvailabilityError,
  addTimeOff,
  availabilityMappers,
  deleteAvailabilityOccurrence,
  deleteAvailabilityRule,
  editAvailabilityOccurrence,
  listAvailabilityRulesForSpecialists,
  listRoomAvailabilityRules,
  listRoomOccupancy,
  parseTstzRange,
  saveAvailabilityRule,
} from "./availability";

const ROOM = "20000000-0000-4000-8000-000000000001";

const input = {
  recurrence: "weekly" as const,
  weekdays: [5, 1],
  intervalWeeks: 1,
  startsAt: "09:00",
  endsAt: "13:00",
  validFrom: "2030-01-07",
  ends: "never" as const,
  validUntil: null,
  occurrenceCount: null,
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
        recurrence: "weekly",
        weekdays: [2, 4],
        interval_weeks: 2,
        occurrence_count: 6,
        starts_at: "09:00:00",
        ends_at: "12:30:00",
        valid_from: "2030-01-07",
        valid_until: null,
        mode: "hybrid",
        room_id: ROOM,
        note: null,
        created_at: "",
        updated_at: "",
        exceptions: [{ date: "2030-01-16" }, { date: "2030-01-09" }],
      }),
    ).toEqual({
      id: "rule",
      specialistId: "specialist",
      recurrence: "weekly",
      weekdays: [2, 4],
      intervalWeeks: 2,
      occurrenceCount: 6,
      exceptions: ["2030-01-09", "2030-01-16"],
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
      p_weekdays: [1, 5],
      p_interval_weeks: 1,
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
      {
        ...input,
        mode: "online",
        ends: "count",
        occurrenceCount: 10,
        note: null,
      },
      { id: "rule-id", specialistId: "specialist" },
    );

    expect(rpc).toHaveBeenCalledWith("save_availability_rule", {
      p_recurrence: "weekly",
      p_weekdays: [1, 5],
      p_interval_weeks: 1,
      p_starts_at: "09:00",
      p_ends_at: "13:00",
      p_valid_from: "2030-01-07",
      p_occurrence_count: 10,
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
    [{ code: "23P01", hint: "room_closed" }, "room_closed"],
    [{ code: "23514", hint: "off_grid" }, "off_grid"],
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

describe("occurrences", () => {
  it("removes an occurrence with a scope", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    await deleteAvailabilityOccurrence({ rpc } as never, {
      ruleId: "rule-id",
      date: "2030-01-16",
      scope: "following",
    });
    expect(rpc).toHaveBeenCalledWith("delete_availability_occurrence", {
      p_rule_id: "rule-id",
      p_date: "2030-01-16",
      p_scope: "following",
    });
  });

  it("changes an occurrence with a scope and validated values", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "new-id", error: null });
    const id = await editAvailabilityOccurrence(
      { rpc } as never,
      { ruleId: "rule-id", date: "2030-01-14", scope: "this" },
      { ...input, recurrence: "once", validFrom: "2030-01-14", note: null },
    );
    expect(rpc).toHaveBeenCalledWith("edit_availability_occurrence", {
      p_rule_id: "rule-id",
      p_date: "2030-01-14",
      p_scope: "this",
      p_recurrence: "once",
      p_weekdays: [1],
      p_interval_weeks: 1,
      p_starts_at: "09:00",
      p_ends_at: "13:00",
      p_valid_from: "2030-01-14",
      p_valid_until: "2030-01-14",
      p_mode: "in_person",
      p_room_id: ROOM,
    });
    expect(id).toBe("new-id");
  });

  it("rejects an unknown scope before calling the database", async () => {
    const rpc = vi.fn();
    await expect(
      deleteAvailabilityOccurrence({ rpc } as never, {
        ruleId: "rule-id",
        date: "2030-01-16",
        scope: "some" as never,
      }),
    ).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
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

describe("listRoomAvailabilityRules", () => {
  it("reads the room's windows with each specialist's name", async () => {
    const order = vi.fn();
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      order,
    };
    order.mockReturnValueOnce(query).mockResolvedValueOnce({
      data: [
        {
          id: "rule",
          specialist_id: "specialist",
          recurrence: "weekly",
          weekdays: [1],
          interval_weeks: 1,
          occurrence_count: null,
          starts_at: "09:00:00",
          ends_at: "12:00:00",
          valid_from: "2030-01-07",
          valid_until: null,
          mode: "in_person",
          room_id: ROOM,
          note: null,
          created_at: "",
          updated_at: "",
          exceptions: [],
          specialist: {
            color: "#2f5fa7",
            profile: {
              first_name: "Anna Maria",
              last_name: "Nowak",
              avatar_url: null,
            },
            public_profile: {
              first_name: "Anna",
              last_name: "Nowak-Kowal",
              display_name: "Anna Nowak-Kowal",
              profile_photo_url: "anna/photo.webp",
            },
          },
        },
        {
          id: "rule-2",
          specialist_id: "other",
          recurrence: "once",
          weekdays: [2],
          interval_weeks: 1,
          occurrence_count: null,
          starts_at: "13:00:00",
          ends_at: "14:00:00",
          valid_from: "2030-01-08",
          valid_until: "2030-01-08",
          mode: "online",
          room_id: ROOM,
          note: null,
          created_at: "",
          updated_at: "",
          exceptions: [],
          specialist: {
            color: "#2f5fa7",
            profile: { first_name: "", last_name: "", avatar_url: null },
            public_profile: {
              first_name: "Jan",
              last_name: "Kowalski",
              display_name: "Jan Kowalski",
              profile_photo_url: null,
              portrait_photo_url: "jan/portrait.webp",
            },
          },
        },
      ],
      error: null,
    });
    const from = vi.fn(() => query);

    const rules = await listRoomAvailabilityRules({ from } as never, ROOM);

    expect(from).toHaveBeenCalledWith("specialist_availability_rules");
    expect(query.eq).toHaveBeenCalledWith("room_id", ROOM);
    expect(rules).toEqual([
      expect.objectContaining({
        id: "rule",
        startsAt: "09:00",
        specialistName: "Anna Maria Nowak",
        specialistColor: "#2f5fa7",
        // From the first and the last name, not from every word.
        specialistInitials: "AN",
        specialistAvatarUrl: null,
        // The profile photo, signed by the page that shows it.
        specialistPhotoPath: "anna/photo.webp",
      }),
      // Without a name on the account, the public profile's name.
      expect.objectContaining({
        id: "rule-2",
        specialistName: "Jan Kowalski",
        specialistInitials: "JK",
        // No profile photo: no picture (the portrait is not an avatar).
        specialistPhotoPath: null,
      }),
    ]);
  });
});

describe("listRoomOccupancy", () => {
  it("reads who has which room when, as HH:MM", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          room_id: ROOM,
          day: "2030-01-08",
          starts_at: "13:00:00",
          ends_at: "16:00:00",
          specialist_id: "anna",
          specialist_name: "Anna Maria Nowak",
          specialist_first_name: "Anna Maria",
          specialist_last_name: "Nowak",
          specialist_avatar_url: null,
          specialist_photo_path: "anna/photo.webp",
        },
      ],
      error: null,
    });

    expect(
      await listRoomOccupancy({ rpc } as never, "2030-01-07", "2030-01-13"),
    ).toEqual([
      {
        roomId: ROOM,
        date: "2030-01-08",
        startsAt: "13:00",
        endsAt: "16:00",
        specialistId: "anna",
        specialistName: "Anna Maria Nowak",
        specialistInitials: "AN",
        specialistAvatarUrl: null,
        specialistPhotoPath: "anna/photo.webp",
      },
    ]);
    expect(rpc).toHaveBeenCalledWith("list_room_occupancy", {
      p_from: "2030-01-07",
      p_to: "2030-01-13",
    });
  });
});

describe("a taken room", () => {
  it("says who has it and when", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: {
        code: "23P01",
        hint: "room_taken",
        message: "x",
        details:
          '{"date": "2030-01-08", "endsAt": "16:00", "startsAt": "13:00", "specialist": "Anna Nowak"}',
      },
    });
    await expect(
      saveAvailabilityRule({ rpc } as never, input),
    ).rejects.toMatchObject({
      reason: "room_taken",
      conflict: {
        specialistName: "Anna Nowak",
        date: "2030-01-08",
        startsAt: "13:00",
        endsAt: "16:00",
      },
    });
  });

  it("copes without details", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "23P01", hint: "room_taken", message: "x", details: "" },
    });
    await expect(
      saveAvailabilityRule({ rpc } as never, input),
    ).rejects.toMatchObject({ reason: "room_taken", conflict: null });
  });
});

describe("listAvailabilityRulesForSpecialists", () => {
  it("reads the rules of several specialists in force over the dates", async () => {
    const order = vi.fn();
    const query = {
      select: vi.fn(() => query),
      in: vi.fn(() => query),
      lte: vi.fn(() => query),
      or: vi.fn(() => query),
      order,
    };
    order.mockReturnValueOnce(query).mockResolvedValueOnce({
      data: [
        {
          id: "rule",
          specialist_id: "a",
          recurrence: "once",
          weekdays: [3],
          interval_weeks: 1,
          occurrence_count: null,
          starts_at: "09:00:00",
          ends_at: "12:00:00",
          valid_from: "2030-10-02",
          valid_until: "2030-10-02",
          mode: "online",
          room_id: null,
          note: null,
          created_at: "",
          updated_at: "",
          exceptions: null,
        },
      ],
      error: null,
    });
    const client = { from: vi.fn(() => query) };

    const rules = await listAvailabilityRulesForSpecialists(client as never, {
      specialistIds: ["a", "b"],
      from: "2030-09-30",
      to: "2030-10-06",
    });

    expect(client.from).toHaveBeenCalledWith("specialist_availability_rules");
    expect(query.in).toHaveBeenCalledWith("specialist_id", ["a", "b"]);
    expect(query.lte).toHaveBeenCalledWith("valid_from", "2030-10-06");
    expect(query.or).toHaveBeenCalledWith(
      "valid_until.is.null,valid_until.gte.2030-09-30",
    );
    expect(rules).toMatchObject([
      { id: "rule", specialistId: "a", startsAt: "09:00", exceptions: [] },
    ]);
  });

  it("asks nothing for nobody, and rejects a malformed date", async () => {
    const client = { from: vi.fn() };
    await expect(
      listAvailabilityRulesForSpecialists(client as never, {
        specialistIds: [],
        from: "2030-09-30",
        to: "2030-10-06",
      }),
    ).resolves.toEqual([]);
    await expect(
      listAvailabilityRulesForSpecialists(client as never, {
        specialistIds: ["a"],
        from: "2030-09-30,valid_until.is.null",
        to: "2030-10-06",
      }),
    ).rejects.toThrow();
    expect(client.from).not.toHaveBeenCalled();
  });
});
