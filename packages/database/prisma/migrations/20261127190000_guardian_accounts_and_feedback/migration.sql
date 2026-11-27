-- Additive migration for PRI-12 (Conta própria do responsável) and PRI-10 (Devolutiva de menores).
-- Keeps all existing users with loginEnabled = true and preserves all existing identities, appointments and records.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'GUARDIAN';

BEGIN;

ALTER TABLE "users"
  ADD COLUMN "loginEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "contactPhone" VARCHAR(20),
  ALTER COLUMN "email" DROP NOT NULL,
  ALTER COLUMN "passwordHash" DROP NOT NULL,
  ADD CONSTRAINT "users_login_credentials_required" CHECK (
    "loginEnabled" = false OR ("email" IS NOT NULL AND "passwordHash" IS NOT NULL)
  );

CREATE TYPE "GuardianLinkStatus" AS ENUM ('ACTIVE', 'REVOKED');

CREATE TABLE "guardian_patients" (
  "id" TEXT NOT NULL,
  "guardianUserId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "relationship" VARCHAR(60) NOT NULL,
  "status" "GuardianLinkStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdByUserId" TEXT,
  "revokedByUserId" TEXT,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "guardian_patients_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "guardian_patients_guardianUserId_patientId_key"
  ON "guardian_patients"("guardianUserId", "patientId");
CREATE INDEX "guardian_patients_guardianUserId_status_idx"
  ON "guardian_patients"("guardianUserId", "status");
CREATE INDEX "guardian_patients_patientId_status_idx"
  ON "guardian_patients"("patientId", "status");

ALTER TABLE "guardian_patients"
  ADD CONSTRAINT "guardian_patients_guardianUserId_fkey"
    FOREIGN KEY ("guardianUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "guardian_patients_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "guardian_patients_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "guardian_patients_revokedByUserId_fkey"
    FOREIGN KEY ("revokedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "schedule_requests"
  ADD COLUMN "requestedByUserId" TEXT;

CREATE INDEX "schedule_requests_requestedByUserId_idx"
  ON "schedule_requests"("requestedByUserId");

ALTER TABLE "schedule_requests"
  ADD CONSTRAINT "schedule_requests_requestedByUserId_fkey"
    FOREIGN KEY ("requestedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
