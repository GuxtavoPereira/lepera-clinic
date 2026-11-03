CREATE TYPE "ScheduleRequestMode" AS ENUM ('EXACT', 'FLEXIBLE');
ALTER TABLE "schedule_requests"
  ADD COLUMN "mode" "ScheduleRequestMode" NOT NULL DEFAULT 'FLEXIBLE',
  ADD COLUMN "requestedStartDatetime" TIMESTAMP(3),
  ADD COLUMN "durationMinutes" INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN "modality" "Modality" NOT NULL DEFAULT 'IN_PERSON';
ALTER TABLE "schedule_requests" ADD CONSTRAINT "schedule_requests_exact_slot" CHECK (
  "mode" <> 'EXACT' OR ("preferredDoctorId" IS NOT NULL AND "requestedStartDatetime" IS NOT NULL)
);
ALTER TABLE "users" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE "password_reset_tokens" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" CHAR(64) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");
CREATE INDEX "password_reset_tokens_userId_expiresAt_idx" ON "password_reset_tokens"("userId", "expiresAt");
