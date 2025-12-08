## Goals
- Add a robust way to manage Quran reciters and their audio sources
- Make Full Quran page easier: clear playback modes (verse/full), visible badges
- Use Supabase Storage for custom audio; keep OneDrive for ad‑hoc items only

## Data Model
- Option A (fast): Create a `src/data/reciters.ts` with an array of reciters
  - Fields: `id`, `name`, `flag`, `baseUrl`, `supportsVerseAudio` (true/false), `verseEditionId` (e.g., `ar.saadalghamdi`)
- Option B (managed): Create Supabase `public.quran_reciters` table
  - Columns: `id (text pk)`, `name`, `flag`, `base_url`, `supports_verse_audio`, `verse_edition_id`, `active`
  - RLS: select for all; insert/update for admin (auth.uid)

## UI Changes (Full Quran)
- Reciter selector shows:
  - Name + flag
  - Badge: “Verse audio available” or “Full surah only”
- Playback mode toggle:
  - Buttons: “Verse‑by‑verse” and “Full surah”
  - Button label changes accordingly (“Play Surah (verse)” vs “Play Full Surah”)
- Fallback playback chain:
  - Try selected reciter full‑surah MP3 (`<baseUrl>/<NNN>.mp3`)
  - Fall back to Alafasy, then Ghamdi automatically on error
- Surah number handling:
  - Always use 3‑digit numbers (`001`…`114`) to build URLs

## Admin Management (optional)
- Add a simple Admin Reciters page to manage the list (Option B)
  - List existing reciters, add new, edit `base_url`, toggle `supports_verse_audio`
  - Validate URL with a lightweight HEAD/GET check to `001.mp3`
- For non‑Quran content (nasheeds, lectures): continue using Admin Audio Content with Supabase Storage

## OneDrive Guidance
- OneDrive can host single files via direct download links but does not support folder listing without Graph OAuth
- For Quran (114 files per reciter), use sources with predictable paths (QuranicAudio, MP3Quran) or Supabase Storage
- If you must use OneDrive, paste direct links for individual items (e.g., nasheeds) in Admin Audio Content

## Implementation Steps
1. Add reciters config (Option A) or Supabase table (Option B)
2. Update FullQuran to read reciters list, show badges and playback mode toggle
3. Implement full‑surah playback fallback chain and consistent 3‑digit numbering
4. Keep verse audio mapping stable via `verseEditionId`; default to Alafasy when a reciter lacks verse audio
5. (Optional) Build Admin Reciters page and wire CRUD to Supabase
6. Test several surahs across all reciters and both playback modes

## Verification
- Desktop/mobile playback for Abdul Wadud Haneef, Ghamdi, Maher, Sudais
- Verse mode continues to work (falls back to Alafasy where needed)
- Full‑surah mode plays via primary or fallback without console errors impacting playback

Confirm this plan and I’ll implement the reciters management and UI changes, wire Supabase for admin editing (if chosen), and test multiple surahs end‑to‑end.