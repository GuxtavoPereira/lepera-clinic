import { z } from "zod";
import { CpfSchema } from "./users";

export const CreatePatientSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  cpf: CpfSchema,
  birthDate: z.string().optional(),
  insuranceProvider: z.string().optional(),
});
export type CreatePatientInput = z.infer<typeof CreatePatientSchema>;

export const PatientResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  birthDate: z.string().nullable(),
  responsibleDoctorId: z.string().nullable(),
});
export type PatientResponse = z.infer<typeof PatientResponseSchema>;