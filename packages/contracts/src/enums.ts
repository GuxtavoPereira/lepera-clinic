import { z } from "zod";

export const RoleSchema = z.enum(["RECEPTIONIST", "PATIENT", "DOCTOR", "ADMIN"]);
export type Role = z.infer<typeof RoleSchema>;

export const AppointmentStatusSchema = z.enum([
  "SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED", "RESCHEDULED", "WAITING",
]);
export type AppointmentStatus = z.infer<typeof AppointmentStatusSchema>;
// repita para Modality, AppointmentType, RequestStatus, Shift, etc.