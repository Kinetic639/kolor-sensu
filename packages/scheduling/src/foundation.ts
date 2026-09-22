export type RoomSemanticColor = "sage" | "peach" | "lavender" | "sand" | "blue";

export interface ScheduleResourceMetrics {
  bookedMinutes: number;
  availableMinutes: number;
  appointmentCount: number;
  availabilitySummary?: string;
}

export interface SpecialistScheduleResource extends ScheduleResourceMetrics {
  type: "specialist";
  id: string;
  name: string;
  avatar: {
    src?: string;
    alt?: string;
    initials: string;
  };
  professionalTitle: string;
  specialty?: string;
}

export interface RoomScheduleResource extends ScheduleResourceMetrics {
  type: "room";
  id: string;
  name: string;
  color: RoomSemanticColor;
  location?: string;
}

export type ScheduleResource =
  SpecialistScheduleResource | RoomScheduleResource;

interface ScheduleAvailabilityBase {
  id: string;
  start: string;
  end: string;
}

export interface RoomScheduleAvailability extends ScheduleAvailabilityBase {
  kind: "room";
  roomId: string;
  roomName: string;
  roomColor: RoomSemanticColor;
}

export interface OnlineScheduleAvailability extends ScheduleAvailabilityBase {
  kind: "online";
}

export interface HybridScheduleAvailability extends ScheduleAvailabilityBase {
  kind: "hybrid";
  roomId?: string;
  roomName?: string;
}

export type ScheduleAvailability =
  | RoomScheduleAvailability
  | OnlineScheduleAvailability
  | HybridScheduleAvailability;

export function calculateOccupancyPercent(
  bookedMinutes: number,
  availableMinutes: number,
) {
  if (availableMinutes <= 0) return 0;
  const occupancy = (Math.max(0, bookedMinutes) / availableMinutes) * 100;
  return Math.round(Math.min(100, occupancy));
}

export function isScheduleResourceUnavailable(resource: ScheduleResource) {
  return resource.availableMinutes <= 0;
}
