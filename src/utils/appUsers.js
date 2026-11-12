// Shared definition + validation for the "get to know our users" form.
// Lives under src/utils so the Vercel function bundles it (see vercel.json).

export const HEARD_ABOUT_OPTIONS = [
  "Friend / Family",
  "WhatsApp / Telegram group",
  "Social media (Facebook, Instagram, TikTok)",
  "YouTube or video",
  "Google / Search engine",
  "School or Masjid",
  "Google Play / App Store",
  "Other",
];

export const MAX_NAME_LENGTH = 80;
export const MAX_CITY_LENGTH = 80;
export const MIN_AGE = 4;
export const MAX_AGE = 120;

/** Returns an error message, or null when the form input is acceptable. */
export function validateAppUserInput(input) {
  const raw = input || {};

  const fullName = String(raw.fullName || '').trim();
  if (!fullName) return 'Please enter your full name';
  if (fullName.length > MAX_NAME_LENGTH) {
    return `Full name is too long (max ${MAX_NAME_LENGTH} characters)`;
  }

  const ageRaw = raw.age;
  if (ageRaw === '' || ageRaw === null || ageRaw === undefined) return 'Please enter your age';
  const age = Number(ageRaw);
  if (!Number.isFinite(age) || !Number.isInteger(age)) {
    return 'Please enter your age as a whole number';
  }
  if (age < MIN_AGE || age > MAX_AGE) {
    return `Please enter an age between ${MIN_AGE} and ${MAX_AGE}`;
  }

  const city = String(raw.city || '').trim();
  if (!city) return 'Please enter your city';
  if (city.length > MAX_CITY_LENGTH) {
    return `City is too long (max ${MAX_CITY_LENGTH} characters)`;
  }

  const heardAbout = String(raw.heardAbout || '').trim();
  if (!heardAbout) return 'Please tell us how you heard about the app';
  if (!HEARD_ABOUT_OPTIONS.includes(heardAbout)) return 'Please choose one of the listed options';

  return null;
}

/** Builds the DB row for app_user_profiles. */
export function buildAppUserRow(input, meta = {}) {
  const raw = input || {};
  return {
    full_name: String(raw.fullName || '').trim(),
    age: Math.trunc(Number(raw.age)),
    city: String(raw.city || '').trim(),
    heard_about: String(raw.heardAbout || '').trim(),
    source: String(raw.source || 'app-prompt').trim() || 'app-prompt',
    ip_hash: meta.ipHash || null,
    user_agent: meta.userAgent ? String(meta.userAgent).slice(0, 400) : null,
  };
}

export const APP_USER_CSV_HEADERS = [
  { label: 'Submitted at', value: (r) => r.created_at },
  { label: 'Full name', value: (r) => r.full_name },
  { label: 'Age', value: (r) => r.age },
  { label: 'City', value: (r) => r.city },
  { label: 'How they heard about the app', value: (r) => r.heard_about },
  { label: 'Source', value: (r) => r.source },
  { label: 'ID', value: (r) => r.id },
];

/* -------------------------------------------------------------------------- */
/* Local prompt state (per device)                                            */
/* -------------------------------------------------------------------------- */

const SUBMITTED_KEY = 'app_user_profile_submitted_v1';
const DISMISSED_KEY = 'app_user_profile_prompt_dismissed_v1';
const PROMPT_CYCLE_MS = 24 * 60 * 60 * 1000; // re-show after 24 hours

const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

const readTimestamp = (key) => {
  if (!isBrowser) return 0;
  try {
    const raw = localStorage.getItem(key);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
};

const withinCycle = (ts) => Boolean(ts) && Date.now() - ts < PROMPT_CYCLE_MS;

export const hasSubmittedAppUserProfile = () => withinCycle(readTimestamp(SUBMITTED_KEY));

export const markAppUserProfileSubmitted = () => {
  if (!isBrowser) return;
  try {
    localStorage.setItem(SUBMITTED_KEY, String(Date.now()));
  } catch {}
};

export const hasDismissedAppUserPrompt = () => withinCycle(readTimestamp(DISMISSED_KEY));

export const markAppUserPromptDismissed = () => {
  if (!isBrowser) return;
  try {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  } catch {}
};
