-- Never invent a document for existing users. Populate real or explicitly
-- authorized demonstration data before making the column mandatory.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "users" WHERE "cpf" IS NULL) THEN
        RAISE EXCEPTION 'Users without CPF must be reviewed before making CPF mandatory.';
    END IF;
END $$;

ALTER TABLE "users" ALTER COLUMN "cpf" SET NOT NULL;