-- Additive migration for SEC-02 (Distributed rate limiting shared across instances & restarts).
CREATE TABLE "rate_limit_buckets" (
  "key" VARCHAR(255) NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 1,
  "resetAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "rate_limit_buckets_resetAt_idx" ON "rate_limit_buckets"("resetAt");
