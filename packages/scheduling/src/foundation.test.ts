import { describe, expect, it } from "vitest";
import {
  calculateOccupancyPercent,
  isScheduleResourceUnavailable,
  type RoomScheduleResource,
  type SpecialistScheduleResource,
} from "./foundation.js";

describe("scheduling foundation contracts", () => {
  it("rounds occupancy from booked and available minutes", () => {
    expect(calculateOccupancyPercent(300, 480)).toBe(63);
    expect(calculateOccupancyPercent(240, 480)).toBe(50);
  });

  it("returns zero occupancy when availability is zero", () => {
    expect(calculateOccupancyPercent(120, 0)).toBe(0);
  });

  it("resolves specialist and room resources without availability as empty", () => {
    const specialist: SpecialistScheduleResource = {
      type: "specialist",
      id: "specialist-empty",
      name: "Karolina Adamczyk",
      avatar: { initials: "KA" },
      professionalTitle: "Psychoterapeutka",
      bookedMinutes: 0,
      availableMinutes: 0,
      appointmentCount: 0,
    };
    const room: RoomScheduleResource = {
      type: "room",
      id: "room-empty",
      name: "Gabinet 4",
      color: "blue",
      bookedMinutes: 0,
      availableMinutes: 0,
      appointmentCount: 0,
    };

    expect(isScheduleResourceUnavailable(specialist)).toBe(true);
    expect(isScheduleResourceUnavailable(room)).toBe(true);
  });
});
