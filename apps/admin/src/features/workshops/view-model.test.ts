import { emptyWorkshopInput } from "@repo/contracts/workshops";
import type {
  AdminWorkshopRecord,
  AdminWorkshopRow,
} from "@repo/supabase/workshops-admin";
import { describe, expect, it } from "vitest";
import {
  inputToPayload,
  readSegment,
  recordToInput,
  seatsLabel,
  segmentCounts,
  whenLabel,
  workshopList,
} from "./view-model";

const now = new Date("2030-11-01T10:00:00Z");
const zone = "Europe/Warsaw";

function row(patch: Partial<AdminWorkshopRow> = {}): AdminWorkshopRow {
  return {
    id: "w1",
    slug: "uwaznosc",
    title: "Uważność",
    status: "published",
    modality: "in_person",
    startsAt: "2030-11-12T16:00:00Z",
    endsAt: "2030-11-12T18:00:00Z",
    capacity: 12,
    minParticipants: null,
    priceMinor: 15000,
    currencyCode: "PLN",
    confirmed: true,
    registrationEnabled: true,
    leaders: "Anna Nowak",
    locationName: "Centrum",
    roomName: null,
    confirmedCount: 8,
    awaitingCount: 1,
    heldCount: 0,
    waitlistCount: 2,
    paidMinor: 120000,
    updatedAt: "2030-10-01T10:00:00Z",
    ...patch,
  };
}

describe("the list", () => {
  const rows = [
    row({
      id: "later",
      startsAt: "2030-12-01T16:00:00Z",
      endsAt: "2030-12-01T18:00:00Z",
    }),
    row({ id: "soon" }),
    row({ id: "draft", status: "draft" }),
    row({ id: "gone", status: "cancelled" }),
    row({
      id: "over",
      startsAt: "2030-10-01T16:00:00Z",
      endsAt: "2030-10-01T18:00:00Z",
    }),
  ];

  it("splits the workshops into segments and counts them", () => {
    expect(segmentCounts(rows, now)).toEqual({
      nadchodzace: 2,
      szkice: 1,
      minione: 1,
      odwolane: 1,
      wszystkie: 5,
    });
    expect(
      workshopList(rows, { segment: "nadchodzace", query: "", now }).map(
        (one) => one.id,
      ),
    ).toEqual(["soon", "later"]);
    expect(readSegment("cokolwiek")).toBe("nadchodzace");
  });

  it("finds a workshop by its title or leader", () => {
    expect(
      workshopList(rows, { segment: "wszystkie", query: "anna", now }),
    ).toHaveLength(5);
    expect(
      workshopList(rows, { segment: "wszystkie", query: "joga", now }),
    ).toHaveLength(0);
  });

  it("says the time and the seats", () => {
    expect(whenLabel(row().startsAt, row().endsAt, zone)).toBe(
      "wt., 12 lis 2030, 17:00–19:00",
    );
    expect(seatsLabel(row())).toEqual({
      seats: "8 / 12",
      waiting: "1 czeka na wpłatę, 2 na liście",
    });
  });
});

describe("the form and the database", () => {
  const leader = "4f9b6d2e-8c1a-4e3b-9f7d-2a6c5b8e1d40";

  it("saves the day and hours in the centre's time, and the closing time before the start", () => {
    const payload = inputToPayload(
      {
        ...emptyWorkshopInput(leader),
        title: "Uważność",
        slug: "uwaznosc",
        modality: "online",
        locationId: "5a1c2d3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e",
        date: "2030-11-12",
        startTime: "17:00",
        endTime: "19:30",
        closesHoursBefore: 48,
        coLeaderIds: [leader, "6b2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f"],
        serviceIds: ["7c3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f60"],
        articleIds: ["8d4f5a6b-7c8d-4e9f-8a1b-2c3d4e5f6a70"],
        meetingUrl: "https://meet.example.invalid/x",
      },
      zone,
    );
    expect(payload).toMatchObject({
      starts_at: "2030-11-12T16:00:00.000Z",
      ends_at: "2030-11-12T18:30:00.000Z",
      registration_closes_at: "2030-11-10T16:00:00.000Z",
      location_id: null,
      co_leader_ids: ["6b2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f"],
      service_ids: ["7c3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f60"],
      article_ids: ["8d4f5a6b-7c8d-4e9f-8a1b-2c3d4e5f6a70"],
      meeting_url: "https://meet.example.invalid/x",
    });
  });

  it("reads the database's workshop back into the form", () => {
    const record = {
      id: "w1",
      slug: "uwaznosc",
      title: "Uważność",
      status: "draft",
      shortDescription: null,
      body: null,
      audience: null,
      agenda: null,
      coverPath: null,
      coverAlt: null,
      seoTitle: null,
      seoDescription: null,
      specialistId: leader,
      coLeaderIds: [],
      serviceIds: ["7c3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f60"],
      articleIds: [],
      modality: "in_person",
      locationId: null,
      roomId: null,
      startsAt: "2030-07-01T15:00:00Z",
      endsAt: "2030-07-01T17:00:00Z",
      priceMinor: 0,
      capacity: 10,
      minParticipants: 3,
      registrationEnabled: true,
      registrationClosesAt: "2030-06-30T15:00:00Z",
      confirmedAt: null,
      cancelReason: null,
      meetingUrl: null,
      activeRegistrations: 0,
      anyRegistrations: false,
      updatedAt: "2030-06-01T10:00:00Z",
    } satisfies AdminWorkshopRecord;
    expect(recordToInput(record, zone)).toMatchObject({
      date: "2030-07-01",
      startTime: "17:00",
      endTime: "19:00",
      closesHoursBefore: 24,
      shortDescription: "",
      meetingUrl: "",
    });
  });
});

describe("the dashboard's workshop tasks", () => {
  it("asks to close an ended one, to decide on a minimum, and shows the week's", async () => {
    const { workshopTasks } = await import("./view-model");
    const tasks = workshopTasks(
      [
        row({
          id: "ended",
          startsAt: "2030-10-30T16:00:00Z",
          endsAt: "2030-10-30T18:00:00Z",
        }),
        row({
          id: "few",
          minParticipants: 10,
          confirmed: false,
          startsAt: "2030-11-08T16:00:00Z",
          endsAt: "2030-11-08T18:00:00Z",
        }),
        row({
          id: "soon",
          startsAt: "2030-11-05T16:00:00Z",
          endsAt: "2030-11-05T18:00:00Z",
        }),
        row({ id: "later" }),
        row({
          id: "draft",
          status: "draft",
          startsAt: "2030-11-03T16:00:00Z",
          endsAt: "2030-11-03T18:00:00Z",
        }),
      ],
      now,
      zone,
    );
    expect(tasks.map((task) => task.id)).toEqual([
      "workshop-close-ended",
      "workshop-minimum-few",
      "workshop-soon-soon",
    ]);
    expect(tasks[1]!.detail).toMatch(/^8 z min\. 10/);
  });
});
