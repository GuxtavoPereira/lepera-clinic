ALTER TABLE "notifications" ADD COLUMN "appointmentId" TEXT;

CREATE INDEX "notifications_appointmentId_idx" ON "notifications"("appointmentId");

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
