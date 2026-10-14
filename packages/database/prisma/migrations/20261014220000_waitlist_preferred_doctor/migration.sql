-- Preserve existing waitlist entries. Abort on stale doctor references.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM "waitlist" w
        LEFT JOIN "doctors" d ON d."id" = w."preferredDoctorId"
        WHERE w."preferredDoctorId" IS NOT NULL AND d."id" IS NULL
    ) THEN
        RAISE EXCEPTION 'Waitlist contains orphaned preferredDoctorId references. Review them before retrying this migration.';
    END IF;
END $$;

ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_preferredDoctorId_fkey"
FOREIGN KEY ("preferredDoctorId") REFERENCES "doctors"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "waitlist_status_priority_enteredAt_idx" ON "waitlist"("status", "priority", "enteredAt");
