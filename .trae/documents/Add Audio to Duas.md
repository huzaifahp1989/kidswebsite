## Overview
Add real audio playback to the Duas page using static MP3 files (Arabic recitation and/or English transliteration). Keep text-to-speech as a fallback when an audio file is missing.

## Asset Strategy
- Store MP3s under `public/duas_audio/` so they publish with the site and work on GitHub Pages.
- Naming convention:
  - Arabic recitation: `/duas_audio/<duaId>-ar.mp3`
  - English transliteration: `/duas_audio/<duaId>-en.mp3`
- Recommended encoding: 96–128 kbps MP3, mono, normalized volume to avoid loudness jumps.

## Data Model Updates
- Extend each dua entry in `src/pages/Duas.jsx` with optional audio URLs:
  - `audioAr: '/duas_audio/bismillah-ar.mp3'`
  - `audioEn: '/duas_audio/bismillah-en.mp3'`
- Keep entries without audio as `null` or omit the field to trigger TTS fallback.

## UI & Playback
- Use a single `<audio>` element per card or a shared player with a per-dua source.
- Buttons:
  - `Play Arabic` → loads `audioAr` if present; otherwise TTS Arabic.
  - `Play Transliteration` → loads `audioEn` if present; otherwise TTS English.
  - `Stop` → pauses and resets the current audio/TTS.
- Behavior:
  - Lazy-load: only set `audio.src` and call `play()` on click (avoids preloading all files).
  - Add `controlsList="nodownload"` (optional) and a separate “Download” link if allowed.
  - Use `playsinline` to ensure mobile playback inside the page.
  - Guard with try/catch and `onerror` → show small hint when playback fails.

## Accessibility & UX
- Provide `aria-label` on buttons: `aria-label="Play Arabic recitation of <title>"`.
- Keep the transcript visible (Arabic, transliteration, translation). This doubles as captions.
- Indicate active playback (e.g., change button state to “Playing…” and show a Stop button).

## Performance
- Don’t preload or auto-play any audio; user gesture starts playback.
- Keep audio bitrates modest; MP3 files typically 50–200 KB each for short duas.
- Optionally enable caching via HTTP headers (GitHub Pages caches static assets by default).

## Deployment
- Place audio files under `public/duas_audio/`.
- Update dua entries in `Duas.jsx` with the audio paths.
- Build and publish:
  - `npm run build:docs-domain`
  - `npm run deploy:docs`

## Verification
- Desktop Chrome/Firefox: test Play/Stop for Arabic and Transliteration.
- iOS Safari/Android Chrome: verify that playback starts only after tapping buttons; ensure `playsinline` works.
- Test entries without audio: confirm TTS fallback still speaks.

## Optional Enhancements
- Add a small per-dua waveform/progress bar (simple time display via `audio.currentTime / audio.duration`).
- Add a global “Stop All” button to cancel any ongoing TTS or audio.
- Host on an external CDN if you plan large audio libraries; update URLs accordingly.

## Next Steps (Implementation)
1. Create `public/duas_audio/` and drop your MP3s using the naming pattern.
2. Update the `duas` array in `src/pages/Duas.jsx` to include `audioAr`/`audioEn` for the entries you have audio for.
3. Introduce an `<audio>` ref and wire Play/Stop handlers to load `src` lazily and call `play()`.
4. Show/hide Stop and a small “Arabic voice missing” hint when TTS fallback is used.
5. Build and deploy to docs; verify on desktop and mobile.

Confirm this plan and I’ll implement the changes and wire the audio buttons on the Duas page.