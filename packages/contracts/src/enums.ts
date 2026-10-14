import { z } from "zod";

export const RoleSchema = z.enum([
  "SUPER_ADMIN",
  "ADMIN",
  "RECEPTIONIST",
  "DOCTOR",
  "PATIENT",
]);
export type Role = z.infer<typeof RoleSchema>;

export const AppointmentStatusSchema = z.enum([
  "SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED", "RESCHEDULED", "WAITING",
]);
export type AppointmentStatus = z.infer<typeof AppointmentStatusSchema>;
