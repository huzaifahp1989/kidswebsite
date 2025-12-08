insert into public.quran_reciters (id, name, flag, base_url, supports_verse_audio, verse_edition_id, active)
values 
  ('awhaneef', 'Abdul Wadud Haneef', '🇸🇦', 'https://download.quranicaudio.com/quran/abdul_wadud_haneef/', false, null, true),
  ('ghamdi', 'Saad Al-Ghamdi', '🇸🇦', 'https://download.quranicaudio.com/quran/saad_al_ghamdi/', true, 'ar.saadalghamdi', true),
  ('maher', 'Maher Al-Muaiqly', '🇸🇦', 'https://download.quranicaudio.com/quran/maher_al_muaiqly/', true, 'ar.maheralmuaiqly', true),
  ('alafasy', 'Mishary Rashid Alafasy', '🇰🇼', 'https://download.quranicaudio.com/quran/mishaari_raashid_al_3afaasee/', true, 'ar.alafasy', true)
on conflict (id) do update set
  name = excluded.name,
  flag = excluded.flag,
  base_url = excluded.base_url,
  supports_verse_audio = excluded.supports_verse_audio,
  verse_edition_id = excluded.verse_edition_id,
  active = excluded.active;