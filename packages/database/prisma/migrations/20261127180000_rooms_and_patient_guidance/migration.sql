-- Additive migration for PRI-08 (Reserva de salas/consultórios) and PRI-09 (Orientações ao paciente).
BEGIN;

CREATE TYPE "RoomReservationStatus" AS ENUM ('CONFIRMED', 'CANCELLED');

CREATE TABLE "clinic_rooms" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(80) NOT NULL,
  "location" VARCHAR(120),
  "capacity" INTEGER NOT NULL DEFAULT 2,
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "clinic_rooms_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "clinic_rooms_capacity_positive" CHECK ("capacity" >= 1 AND "capacity" <= 100)
);

CREATE UNIQUE INDEX "clinic_rooms_name_key" ON "clinic_rooms"("name");

CREATE TABLE "room_reservations" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "reservedById" TEXT NOT NULL,
  "appointmentId" TEXT,
  "title" VARCHAR(140) NOT NULL,
  "notes" TEXT,
  "startDatetime" TIMESTAMP(3) NOT NULL,
  "endDatetime" TIMESTAMP(3) NOT NULL,
  "status" "RoomReservationStatus" NOT NULL DEFAULT 'CONFIRMED',
  "cancelReason" TEXT,
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "room_reservations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "room_reservations_interval_valid" CHECK ("endDatetime" > "startDatetime")
);

CREATE INDEX "room_reservations_roomId_startDatetime_endDatetime_idx"
  ON "room_reservations"("roomId", "startDatetime", "endDatetime");
CREATE INDEX "room_reservations_reservedById_startDatetime_idx"
  ON "room_reservations"("reservedById", "startDatetime");

ALTER TABLE "room_reservations"
  ADD CONSTRAINT "room_reservations_roomId_fkey"
    FOREIGN KEY ("roomId") REFERENCES "clinic_rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "room_reservations_reservedById_fkey"
    FOREIGN KEY ("reservedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "room_reservations_appointmentId_fkey"
    FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TYPE "GuidanceMessageCategory" AS ENUM (
  'POST_SESSION',
  'CANCELLATION_NOTICE',
  'PREPARATION',
  'GENERAL'
);

CREATE TABLE "patient_guidance_messages" (
  "id" TEXT NOT NULL,
  "doctorId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "appointmentId" TEXT,
  "category" "GuidanceMessageCategory" NOT NULL DEFAULT 'POST_SESSION',
  "subject" VARCHAR(160) NOT NULL,
  "body" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "patient_guidance_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "patient_guidance_messages_patientId_createdAt_idx"
  ON "patient_guidance_messages"("patientId", "createdAt");
CREATE INDEX "patient_guidance_messages_doctorId_createdAt_idx"
  ON "patient_guidance_messages"("doctorId", "createdAt");

ALTER TABLE "patient_guidance_messages"
  ADD CONSTRAINT "patient_guidance_messages_doctorId_fkey"
    FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "patient_guidance_messages_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "patient_guidance_messages_appointmentId_fkey"
    FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
