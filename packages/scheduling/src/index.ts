import type { Appointment } from "@repo/contracts";

export { formatZonedDateTime } from "./date.js";

/** Shared scheduling primitives will live here without UI or persistence concerns. */
export type SchedulingAppointment = Appointment;
