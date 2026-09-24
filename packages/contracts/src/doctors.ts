// contracts: packages/contracts/src/doctors.ts
export const CreateDoctorSchema = CreateUserBaseSchema.extend({
  licenseNumber: z.string().min(3),
  specialty: z.string().min(2),
  clinicalApproach: z.string().optional(),
  bio: z.string().optional(),
  room: z.string().optional(),
});
export type CreateDoctorInput = z.infer<typeof CreateDoctorSchema>;