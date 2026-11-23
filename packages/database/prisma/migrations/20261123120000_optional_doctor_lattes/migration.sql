-- Optional public presentation fields. Existing doctors remain unchanged.
ALTER TABLE "doctors"
ADD COLUMN "lattesUrl" TEXT,
ADD COLUMN "lattesSummary" TEXT;
