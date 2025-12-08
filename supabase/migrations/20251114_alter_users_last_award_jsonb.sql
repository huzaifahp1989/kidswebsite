-- Change last_award to JSONB to store structured award details
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'last_award'
  ) THEN
    ALTER TABLE public.users
      ALTER COLUMN last_award TYPE JSONB USING CASE WHEN last_award IS NULL THEN NULL ELSE to_jsonb(last_award) END;
  ELSE
    ALTER TABLE public.users ADD COLUMN last_award JSONB;
  END IF;
END $$;

