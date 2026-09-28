import type { Appointment } from "@repo/contracts";

export * from "./availability";
export { DEFAULT_TIME_ZONE, formatZonedDateTime } from "./date";
export * from "./grid";
export * from "./slots";

/** Shared scheduling primitives will live here without UI or persistence concerns. */
export type SchedulingAppointment = Appointment;
