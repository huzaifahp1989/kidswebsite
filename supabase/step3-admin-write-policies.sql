-- STEP 3 — Run after schema.sql (needs announcements + sponsors tables)
-- Lets logged-in admin save announcements and sponsors

drop policy if exists "Authenticated manage announcements" on public.announcements;
create policy "Authenticated manage announcements"
  on public.announcements for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated manage sponsors" on public.sponsors;
create policy "Authenticated manage sponsors"
  on public.sponsors for all
  to authenticated
  using (true)
  with check (true);
