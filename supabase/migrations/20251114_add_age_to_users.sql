-- Add age column to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS age INTEGER;

-- Optional index for queries by age
CREATE INDEX IF NOT EXISTS idx_users_age ON public.users(age);

