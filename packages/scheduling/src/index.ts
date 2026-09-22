import type { Appointment } from "@repo/contracts";

export { formatZonedDateTime } from "./date.js";
export {
  calculateOccupancyPercent,
  isScheduleResourceUnavailable,
} from "./foundation.js";
export type {
  HybridScheduleAvailability,
  OnlineScheduleAvailability,
  RoomScheduleAvailability,
  RoomScheduleResource,
  RoomSemanticColor,
  ScheduleAvailability,
  ScheduleResource,
  ScheduleResourceMetrics,
  SpecialistScheduleResource,
} from "./foundation.js";

/** Shared scheduling primitives will live here without UI or persistence concerns. */
export type SchedulingAppointment = Appointment;
