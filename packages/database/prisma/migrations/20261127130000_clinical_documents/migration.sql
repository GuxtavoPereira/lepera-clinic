-- Additive migration for PRI-06 (Documentos do psicólogo).
-- Preserves all existing clinical_records and tables untouched.
BEGIN;

CREATE TYPE "ClinicalDocumentType" AS ENUM (
  'PSYCHOLOGICAL_REPORT',
  'PROGRESS_RECORD',
  'CLINICAL_REPORT',
  'INITIAL_INTERVIEW',
  'PSYCHOLOGICAL_ASSESSMENT',
  'GENERAL_NOTE',
  'FIELD_DIARY',
  'GUARDIAN_FEEDBACK',
  'OTHER'
);

CREATE TYPE "ClinicalDocumentStatus" AS ENUM (
  'DRAFT',
  'SIGNED',
  'SUPERSEDED'
);

CREATE TYPE "ClinicalDocumentVisibility" AS ENUM (
  'INTERNAL',
  'PATIENT_RELEASED',
  'GUARDIAN_RELEASED'
);

CREATE TABLE "clinical_documents" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "doctorId" TEXT NOT NULL,
  "appointmentId" TEXT,
  "type" "ClinicalDocumentType" NOT NULL,
  "title" VARCHAR(160) NOT NULL,
  "documentNumber" VARCHAR(40),
  "version" INTEGER NOT NULL DEFAULT 1,
  "previousVersionId" TEXT,
  "status" "ClinicalDocumentStatus" NOT NULL DEFAULT 'DRAFT',
  "visibility" "ClinicalDocumentVisibility" NOT NULL DEFAULT 'INTERNAL',
  "content" TEXT NOT NULL,
  "signedAt" TIMESTAMP(3),
  "releasedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "clinical_documents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "clinical_documents_version_positive" CHECK ("version" >= 1),
  CONSTRAINT "clinical_documents_internal_only_visibility" CHECK (
    "type" NOT IN ('GENERAL_NOTE', 'FIELD_DIARY') OR "visibility" = 'INTERNAL'
  ),
  CONSTRAINT "clinical_documents_release_requires_signed" CHECK (
    "visibility" = 'INTERNAL' OR "status" <> 'DRAFT'
  )
);

CREATE UNIQUE INDEX "clinical_documents_previousVersionId_key" ON "clinical_documents"("previousVersionId");
CREATE INDEX "clinical_documents_doctorId_updatedAt_idx" ON "clinical_documents"("doctorId", "updatedAt");
CREATE INDEX "clinical_documents_patientId_updatedAt_idx" ON "clinical_documents"("patientId", "updatedAt");
CREATE INDEX "clinical_documents_type_status_idx" ON "clinical_documents"("type", "status");

ALTER TABLE "clinical_documents"
  ADD CONSTRAINT "clinical_documents_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "clinical_documents_doctorId_fkey"
    FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "clinical_documents_appointmentId_fkey"
    FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "clinical_documents_previousVersionId_fkey"
    FOREIGN KEY ("previousVersionId") REFERENCES "clinical_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
