-- Daily child progress logs
CREATE TABLE IF NOT EXISTS public.child_progress_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quran INTEGER DEFAULT 0,
  salah INTEGER DEFAULT 0,
  tasbeeh INTEGER DEFAULT 0,
  durood INTEGER DEFAULT 0,
  helping_parents INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.child_progress_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read own logs" ON public.child_progress_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow insert own logs" ON public.child_progress_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow update own logs" ON public.child_progress_logs
  FOR UPDATE USING (auth.uid() = user_id);

GRANT SELECT ON public.child_progress_logs TO anon;
GRANT SELECT, INSERT, UPDATE ON public.child_progress_logs TO authenticated;

CREATE INDEX IF NOT EXISTS idx_child_progress_user_date ON public.child_progress_logs(user_id, log_date DESC);

