// Shared survey definition + validation used by the public page and the API.
// Lives under src/utils so the Vercel function bundles it (see vercel.json).

export const SURVEY_TERMS_VERSION = 'v1';

export const MAX_TEXT_ANSWER_LENGTH = 600;
export const MAX_NAME_LENGTH = 60;
export const MAX_EMAIL_LENGTH = 160;

/**
 * The fixed question set for the "Have Your Say" survey. Each question gets a
 * stable `key`; answers are stored as a JSON object keyed by it so past
 * campaigns stay readable even if the wording changes later.
 */
export const SURVEY_QUESTIONS = [
  {
    key: 'discovery',
    type: 'single',
    required: true,
    title: 'How did you first discover Islam Media Central?',
    options: ['Social media', 'Family or friends', 'WhatsApp', 'Google search', 'Radio Seerah', 'Other'],
  },
  {
    key: 'features',
    type: 'multi',
    required: true,
    title: 'Which features do you enjoy most?',
    help: 'Select all that apply.',
    options: [
      'Quran recitation',
      'Islamic reminders',
      'Hadith and Islamic articles',
      "Children's Islamic games and quizzes",
      'Quran and Nasheed competitions',
      'Podcasts and Islamic talks',
      'Other',
    ],
  },
  {
    key: 'additions',
    type: 'multi',
    required: true,
    title: 'What would you like to see added to Islam Media Central?',
    help: 'Select all that apply.',
    options: [
      'More Islamic quizzes',
      "More children's activities",
      'More competitions and prizes',
      'More Quran recitations',
      'More Islamic videos',
      'More nasheeds',
      'Other suggestions',
    ],
  },
  {
    key: 'frequency',
    type: 'single',
    required: true,
    title: 'How often do you use Islam Media Central?',
    options: ['Every day', 'Several times a week', 'Once a week', 'Occasionally', 'This is my first visit'],
  },
  {
    key: 'recommend',
    type: 'single',
    required: true,
    title: 'Would you recommend Islam Media Central to friends and family?',
    options: ['Definitely', 'Probably', 'Not sure', 'Probably not'],
  },
  {
    key: 'favourite',
    type: 'text',
    required: false,
    title: 'What is your favourite part of Islam Media Central?',
    placeholder: 'Optional — tell us in your own words',
    maxLength: MAX_TEXT_ANSWER_LENGTH,
  },
  {
    key: 'improvements',
    type: 'text',
    required: false,
    title: 'What improvements would make your experience better?',
    placeholder: 'Optional — what would you change?',
    maxLength: MAX_TEXT_ANSWER_LENGTH,
  },
];

export const SURVEY_QUESTION_MAP = SURVEY_QUESTIONS.reduce((acc, q) => {
  acc[q.key] = q;
  return acc;
}, {});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function isValidEmail(email) {
  const value = String(email || '').trim();
  return value.length > 0 && value.length <= MAX_EMAIL_LENGTH && EMAIL_PATTERN.test(value);
}

/** Number of questions the participant has completed (for the progress bar). */
export function countAnswered(answers) {
  const raw = answers || {};
  return SURVEY_QUESTIONS.filter((q) => {
    const value = raw[q.key];
    if (q.type === 'multi') return Array.isArray(value) && value.length > 0;
    return typeof value === 'string' && value.trim().length > 0;
  }).length;
}

/** Returns an error message, or null when the answers are acceptable. */
export function validateAnswers(answers) {
  const raw = answers && typeof answers === 'object' ? answers : {};
  for (const q of SURVEY_QUESTIONS) {
    const value = raw[q.key];
    if (q.type === 'multi') {
      const list = Array.isArray(value) ? value.filter((v) => typeof v === 'string' && v.trim()) : [];
      if (q.required && list.length === 0) return `Please answer: ${q.title}`;
      const unknown = list.find((v) => !q.options.includes(v));
      if (unknown) return `Unsupported answer for: ${q.title}`;
      continue;
    }
    if (q.type === 'single') {
      const single = typeof value === 'string' ? value.trim() : '';
      if (!single) {
        if (q.required) return `Please answer: ${q.title}`;
        continue;
      }
      if (!q.options.includes(single)) return `Unsupported answer for: ${q.title}`;
      continue;
    }
    // text
    const text = typeof value === 'string' ? value.trim() : '';
    if (text.length > (q.maxLength || MAX_TEXT_ANSWER_LENGTH)) {
      return `Your answer is too long for: ${q.title}`;
    }
  }
  return null;
}

/** Cleans answers into the exact shape stored in survey_entries.answers. */
export function buildAnswers(answers) {
  const raw = answers && typeof answers === 'object' ? answers : {};
  const clean = {};
  for (const q of SURVEY_QUESTIONS) {
    const value = raw[q.key];
    if (q.type === 'multi') {
      clean[q.key] = Array.isArray(value)
        ? value.filter((v) => typeof v === 'string' && q.options.includes(v))
        : [];
    } else if (q.type === 'single') {
      clean[q.key] = typeof value === 'string' && q.options.includes(value) ? value : '';
    } else {
      clean[q.key] = typeof value === 'string' ? value.trim().slice(0, q.maxLength || MAX_TEXT_ANSWER_LENGTH) : '';
    }
  }
  return clean;
}

/** Returns an error message, or null when the entry form is acceptable. */
export function validateEntryInput(input) {
  const raw = input || {};
  const firstName = String(raw.firstName || '').trim();
  if (!firstName) return 'Please enter your first name';
  if (firstName.length > MAX_NAME_LENGTH) return `First name is too long (max ${MAX_NAME_LENGTH} characters)`;
  if (!isValidEmail(raw.email)) return 'Please enter a valid email address';

  const ageBracket = raw.ageBracket === 'minor' ? 'minor' : raw.ageBracket === 'adult' ? 'adult' : '';
  if (!ageBracket) return 'Please confirm whether you are 18 or over';

  if (ageBracket === 'minor') {
    const guardianEmail = String(raw.guardianEmail || '').trim();
    if (!guardianEmail) return 'A parent or guardian email is required for under-18 entries';
    if (!isValidEmail(guardianEmail)) return 'Please enter a valid parent or guardian email address';
    if (raw.guardianConsent !== true) return 'A parent or guardian must confirm consent for under-18 entries';
  }

  if (raw.termsAccepted !== true) return 'Please confirm you have read and agree to the prize draw terms and conditions';
  return null;
}

/** Builds the DB row for survey_entries. */
export function buildEntryRow(input, campaignId, meta = {}) {
  const raw = input || {};
  const ageBracket = raw.ageBracket === 'minor' ? 'minor' : 'adult';
  const email = String(raw.email || '').trim();
  const guardianEmail = ageBracket === 'minor' ? String(raw.guardianEmail || '').trim() || null : null;
  const nowIso = new Date().toISOString();
  return {
    campaign_id: campaignId,
    first_name: String(raw.firstName || '').trim(),
    email,
    email_normalized: normalizeEmail(email),
    age_bracket: ageBracket,
    guardian_email: guardianEmail,
    guardian_consent: ageBracket === 'minor',
    marketing_opt_in: raw.marketingOptIn === true,
    terms_accepted: true,
    consented_at: nowIso,
    answers: buildAnswers(raw.answers),
    ip_hash: meta.ipHash || null,
    user_agent: meta.userAgent ? String(meta.userAgent).slice(0, 400) : null,
  };
}

export function buildPrizeRow(input, campaignId) {
  const raw = input || {};
  const winnersCount = Number.isFinite(Number(raw.winners_count)) && Number(raw.winners_count) > 0
    ? Math.trunc(Number(raw.winners_count))
    : 1;
  const sortOrder = Number.isFinite(Number(raw.sort_order)) ? Math.trunc(Number(raw.sort_order)) : 0;
  return {
    campaign_id: campaignId,
    title: String(raw.title || '').trim(),
    description: String(raw.description || '').trim() || null,
    value_label: String(raw.value_label || '').trim() || null,
    image_url: String(raw.image_url || '').trim() || null,
    winners_count: winnersCount,
    sort_order: sortOrder,
    active: raw.active !== false,
    updated_at: new Date().toISOString(),
  };
}

export function validatePrizeInput(input) {
  const raw = input || {};
  if (!String(raw.title || '').trim()) return 'Prize title is required';
  if (raw.image_url && String(raw.image_url).trim()) {
    try {
      new URL(String(raw.image_url).trim());
    } catch {
      return 'Prize image URL is not valid';
    }
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* CSV helpers                                                                */
/* -------------------------------------------------------------------------- */

function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(headers, rows) {
  const head = headers.map((h) => csvCell(h.label)).join(',');
  const body = rows.map((row) => headers.map((h) => csvCell(h.value(row))).join(','));
  return [head, ...body].join('\r\n');
}

export const ENTRY_CSV_HEADERS = [
  { label: 'Entry ID', value: (r) => r.id },
  { label: 'Submitted at', value: (r) => r.created_at },
  { label: 'First name', value: (r) => r.first_name },
  { label: 'Email', value: (r) => r.email },
  { label: 'Age bracket', value: (r) => (r.age_bracket === 'minor' ? 'Under 18' : '18 or over') },
  { label: 'Guardian email', value: (r) => r.guardian_email },
  { label: 'Guardian consent', value: (r) => (r.guardian_consent ? 'Yes' : 'No') },
  { label: 'Terms accepted', value: (r) => (r.terms_accepted ? 'Yes' : 'No') },
  { label: 'Marketing opt-in', value: (r) => (r.marketing_opt_in ? 'Yes' : 'No') },
];

export const RESPONSE_CSV_HEADERS = [
  ...ENTRY_CSV_HEADERS,
  ...SURVEY_QUESTIONS.map((q) => ({
    label: q.title,
    value: (r) => {
      const value = r.answers ? r.answers[q.key] : undefined;
      if (Array.isArray(value)) return value.join('; ');
      return value || '';
    },
  })),
];

/** Anonymised tallies for the results dashboard. */
export function summarizeAnswers(entries) {
  const list = Array.isArray(entries) ? entries : [];
  return SURVEY_QUESTIONS.map((q) => {
    if (q.type === 'text') {
      const samples = list
        .map((e) => (e.answers ? e.answers[q.key] : ''))
        .filter((v) => typeof v === 'string' && v.trim().length > 0);
      return { key: q.key, title: q.title, type: q.type, total: samples.length, samples: samples.slice(0, 50) };
    }
    const counts = q.options.map((option) => ({
      option,
      count: list.filter((e) => {
        const value = e.answers ? e.answers[q.key] : undefined;
        return Array.isArray(value) ? value.includes(option) : value === option;
      }).length,
    }));
    return { key: q.key, title: q.title, type: q.type, total: list.length, counts };
  });
}
