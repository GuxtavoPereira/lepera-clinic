BEGIN;
CREATE TYPE "InventoryCategory" AS ENUM ('GENERAL', 'PSYCHOLOGICAL_TEST');
CREATE TYPE "PsychologicalTestMaterial" AS ENUM ('KIT', 'MANUAL', 'BOOKLET', 'PROTOCOL', 'RESPONSE_SHEET');
ALTER TABLE "inventory_items"
  ADD COLUMN "category" "InventoryCategory" NOT NULL DEFAULT 'GENERAL',
  ADD COLUMN "testEdition" VARCHAR(80),
  ADD COLUMN "testMaterial" "PsychologicalTestMaterial",
  ADD CONSTRAINT "inventory_test_specification" CHECK (
    ("category" = 'GENERAL' AND "testEdition" IS NULL AND "testMaterial" IS NULL)
    OR ("category" = 'PSYCHOLOGICAL_TEST' AND "testMaterial" IS NOT NULL
        AND "testEdition" IS NOT NULL AND length(trim("testEdition")) > 0)
  );
COMMIT;
