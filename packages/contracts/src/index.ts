import { z } from "zod";

export const userRoleSchema = z.enum(["admin", "specialist", "client"]);

export type UserRole = z.infer<typeof userRoleSchema>;

export interface Specialist {
  id: string;
  name: string;
}

export interface Room {
  id: string;
  name: string;
}

export interface Service {
  id: string;
  name: string;
}

export interface Appointment {
  id: string;
  specialistId: Specialist["id"];
  serviceId: Service["id"];
  startsAt: string;
}
