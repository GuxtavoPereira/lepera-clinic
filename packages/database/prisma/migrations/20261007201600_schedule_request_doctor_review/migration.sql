-- Add the missing relation for the optional preferred professional.
ALTER TABLE "schedule_requests"
ADD CONSTRAINT "schedule_requests_preferredDoctorId_fkey"
FOREIGN KEY ("preferredDoctorId") REFERENCES "doctors"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Record when a request was rejected as well as who reviewed it.
ALTER TABLE "schedule_requests"
ADD COLUMN "reviewedAt" TIMESTAMP(3);
