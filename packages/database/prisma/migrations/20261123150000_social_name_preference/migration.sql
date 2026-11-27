-- `name` remains the display field used by existing calendar/report/API consumers.
-- Identity editors explicitly use civilName; old clients remain supported.
ALTER TABLE "users"
ADD COLUMN "civilName" TEXT,
ADD COLUMN "socialName" TEXT,
ADD COLUMN "useSocialName" BOOLEAN NOT NULL DEFAULT false;

UPDATE "users" SET "civilName" = "name";

CREATE FUNCTION lepera_user_display_name() RETURNS trigger AS $$
BEGIN
  NEW."socialName" := NULLIF(btrim(NEW."socialName"), '');
  IF TG_OP = 'INSERT' THEN
    NEW."civilName" := COALESCE(NEW."civilName", NEW."name");
  ELSE
    -- A legacy client sends `name`. A replay of the display name must not replace identity.
    IF NEW."civilName" IS NOT DISTINCT FROM OLD."civilName"
       AND NEW."name" IS DISTINCT FROM OLD."name" THEN
      NEW."civilName" := NEW."name";
    END IF;
    NEW."civilName" := COALESCE(NEW."civilName", OLD."civilName", OLD."name");
  END IF;
  IF NEW."socialName" IS NULL THEN
    NEW."useSocialName" := false;
  END IF;
  NEW."name" := CASE WHEN NEW."useSocialName" THEN NEW."socialName" ELSE NEW."civilName" END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_display_name
BEFORE INSERT OR UPDATE OF "name", "civilName", "socialName", "useSocialName" ON "users"
FOR EACH ROW EXECUTE FUNCTION lepera_user_display_name();
