-- Additive migration for PRI-13 (Paciente acessa o próprio prontuário).
-- Existing records stay private (releasedToPatient = false) until explicitly released by the authoring psychologist.
ALTER TABLE "clinical_records"
  ADD COLUMN "releasedToPatient" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "releasedAt" TIMESTAMP(3);

CREATE INDEX "clinical_records_patientId_isSigned_releasedToPatient_idx"
  ON "clinical_records"("patientId", "isSigned", "releasedToPatient");
