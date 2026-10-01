import type { Appointment } from "@repo/contracts";

export * from "./availability";
export * from "./calendar-view";
export { DEFAULT_TIME_ZONE, formatZonedDateTime } from "./date";
export * from "./grid";
export * from "./labels";
export * from "./notification-view";
export * from "./room-hours";
export * from "./slots";
export * from "./visit-events";
export * from "./visits";

/** Shared scheduling primitives will live here without UI or persistence concerns. */
export type SchedulingAppointment = Appointment;
