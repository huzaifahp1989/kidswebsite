import crypto from 'node:crypto';
import { supabaseAdmin } from '../src/utils/supabase-admin.js';
import {
  ENTRY_CSV_HEADERS,
  RESPONSE_CSV_HEADERS,
  SURVEY_TERMS_VERSION,
  buildEntryRow,
  buildPrizeRow,
  summarizeAnswers,
  toCsv,
  validateAnswers,
  validateEntryInput,
  validatePrizeInput,
} from '../src/utils/survey.js';

const SETUP_NOT_CONFIGURED_MSG =
  'Survey tables are not configured yet. Apply supabase/create-survey-prize-draw.sql in the Supabase SQL editor.';

const ADMIN_LIST_LIMIT = 1000;
const EXPORT_LIMIT = 20000;
const MIN_FILL_MS = 3500;
const IP_SALT = process.env.SURVEY_IP_SALT || 'imc-survey-ip-salt';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') {
      resolve(req.body);
      return;
    }
    if (typeof req.body === 'string' && req.body) {
      try {
        resolve(JSON.parse(req.body));
      } catch (e) {
        reject(e);
      }
      return;
    }
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function setupNotConfiguredError(res) {
  return json(res, 500, { error: SETUP_NOT_CONFIGURED_MSG, setupRequired: true });
}

function isTableMissing(err) {
  const msg = String((err && err.message) || '');
  return (
    /does not exist/i.test(msg) ||
    /schema cache/i.test(msg) ||
    /could not find the table/i.test(msg)
  );
}

function checkAdminAuth(request) {
  return request.headers['x-admin-auth'] === 'true';
}

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const ip = (raw ? String(raw).split(',')[0] : '') || req.socket?.remoteAddress || '';
  return ip.trim();
}

function hashIp(ip) {
  if (!ip) return null;
  const day = new Date().toISOString().slice(0, 10);
  return crypto.createHash('sha256').update(`${IP_SALT}:${day}:${ip}`).digest('hex').slice(0, 32);
}

/* -------------------------------------------------------------------------- */
/* Campaign helpers                                                           */
/* -------------------------------------------------------------------------- */

function campaignStatus(campaign) {
  const now = Date.now();
  const opensAt = campaign.opens_at ? new Date(campaign.opens_at).getTime() : null;
  const closesAt = campaign.closes_at ? new Date(campaign.closes_at).getTime() : null;
  if (!campaign.is_published) return { isOpen: false, reason: 'This prize draw is not published yet.' };
  if (opensAt && now < opensAt) return { isOpen: false, reason: 'This prize draw has not opened yet.' };
  if (closesAt && now > closesAt) return { isOpen: false, reason: 'This prize draw has now closed. Thank you to everyone who took part!' };
  return { isOpen: true, reason: '' };
}

function publicCampaign(campaign) {
  const status = campaignStatus(campaign);
  return {
    id: campaign.id,
    slug: campaign.slug,
    title: campaign.title,
    subtitle: campaign.subtitle,
    intro: campaign.intro,
    opensAt: campaign.opens_at,
    closesAt: campaign.closes_at,
    maxWinners: campaign.max_winners,
    termsVersion: campaign.terms_version || SURVEY_TERMS_VERSION,
    ...status,
  };
}

async function loadCampaign(slug) {
  let query = supabaseAdmin.from('survey_campaigns').select('*').limit(1);
  query = slug ? query.eq('slug', slug) : query.order('created_at', { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  return (data || [])[0] || null;
}

async function loadPrizes(campaignId, onlyActive = false) {
  let query = supabaseAdmin
    .from('survey_prizes')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (onlyActive) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function countEntries(campaignId) {
  const { count, error } = await supabaseAdmin
    .from('survey_entries')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId);
  if (error) throw error;
  return count || 0;
}

async function loadWinners(campaignId) {
  const { data, error } = await supabaseAdmin
    .from('survey_winners')
    .select(
      `id,entry_id,prize_id,selected_at,selection_method,selection_proof,notified_at,fulfillment_status,notes,
       survey_entries(id,first_name,email,age_bracket,guardian_email),
       survey_prizes(id,title,value_label,image_url)`
    )
    .eq('campaign_id', campaignId)
    .order('selected_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((w) => ({
    id: w.id,
    entryId: w.entry_id,
    prizeId: w.prize_id,
    selectedAt: w.selected_at,
    selectionMethod: w.selection_method,
    selectionProof: w.selection_proof,
    notifiedAt: w.notified_at,
    fulfillmentStatus: w.fulfillment_status,
    notes: w.notes,
    firstName: w.survey_entries?.first_name || '',
    email: w.survey_entries?.email || '',
    ageBracket: w.survey_entries?.age_bracket || 'adult',
    guardianEmail: w.survey_entries?.guardian_email || null,
    prizeTitle: w.survey_prizes?.title || '',
    prizeValue: w.survey_prizes?.value_label || '',
    prizeImage: w.survey_prizes?.image_url || null,
  }));
}

/* -------------------------------------------------------------------------- */
/* Fair random selection (cryptographically secure, non-selective)            */
/* -------------------------------------------------------------------------- */

function secureShuffle(list) {
  const items = [...list];
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/* -------------------------------------------------------------------------- */
/* Handlers                                                                   */
/* -------------------------------------------------------------------------- */

async function handlePublicGet(req, res, url) {
  const campaign = await loadCampaign(url.searchParams.get('slug') || undefined);
  if (!campaign) {
    json(res, 200, { campaign: null, prizes: [], stats: { entries: 0, hasDrawn: false } });
    return;
  }
  const [prizes, entryCount, winners] = await Promise.all([
    loadPrizes(campaign.id, true),
    countEntries(campaign.id),
    loadWinners(campaign.id),
  ]);
  json(res, 200, {
    campaign: publicCampaign(campaign),
    prizes: prizes.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      valueLabel: p.value_label,
      imageUrl: p.image_url,
      winnersCount: p.winners_count,
    })),
    stats: {
      entries: entryCount,
      hasDrawn: winners.length > 0,
      drawnAt: campaign.draw_completed_at || null,
    },
  });
}

async function handleSubmit(req, res) {
  const body = await readBody(req);

  // Spam protection: bots fill the hidden field; humans take a moment to type.
  if (typeof body.company === 'string' && body.company.trim()) {
    json(res, 200, { ok: true, spam: true });
    return;
  }
  const startedAt = Number(body.startedAt);
  if (Number.isFinite(startedAt) && startedAt > 0 && Date.now() - startedAt < MIN_FILL_MS) {
    json(res, 400, { error: 'That was a little too quick — please take a moment to complete the survey.' });
    return;
  }

  const campaign = await loadCampaign(body.slug || undefined);
  if (!campaign) return json(res, 404, { error: 'No prize draw is running at the moment.' });

  const status = campaignStatus(campaign);
  if (!status.isOpen) return json(res, 403, { error: status.reason });

  const answerError = validateAnswers(body.answers);
  if (answerError) return json(res, 400, { error: answerError });

  const entryError = validateEntryInput(body);
  if (entryError) return json(res, 400, { error: entryError });

  const row = buildEntryRow(body, campaign.id, {
    ipHash: hashIp(clientIp(req)),
    userAgent: req.headers['user-agent'],
  });

  if (campaign.draw_completed_at) {
    // Entries stay open for the archive but cannot join a completed draw.
    return json(res, 403, { error: 'The prize draw for this survey has already taken place.' });
  }

  const { data, error } = await supabaseAdmin
    .from('survey_entries')
    .insert(row)
    .select('id,created_at')
    .single();

  if (error) {
    if (isTableMissing(error)) return setupNotConfiguredError(res);
    if (error.code === '23505') {
      return json(res, 409, {
        error: 'This email address has already entered the prize draw. Each person can enter once.',
        alreadyEntered: true,
      });
    }
    throw error;
  }

  json(res, 200, { ok: true, entryId: data.id, submittedAt: data.created_at });
}

async function handleGetEntry(req, res, url) {
  const id = url.searchParams.get('id');
  if (!id) return json(res, 400, { error: 'id is required' });
  const { data, error } = await supabaseAdmin
    .from('survey_entries')
    .select('id,first_name,created_at,campaign_id')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    if (isTableMissing(error)) return setupNotConfiguredError(res);
    throw error;
  }
  if (!data) return json(res, 404, { error: 'Entry not found' });
  json(res, 200, { entry: { id: data.id, firstName: data.first_name, submittedAt: data.created_at } });
}

/* --------------------------------- admin ---------------------------------- */

async function handleAdminGet(req, res, url) {
  const campaign = await loadCampaign(url.searchParams.get('slug') || undefined);
  if (!campaign) {
    json(res, 200, { campaign: null, prizes: [], entries: [], winners: [], results: [], stats: null });
    return;
  }

  const { data: entries, error } = await supabaseAdmin
    .from('survey_entries')
    .select('*')
    .eq('campaign_id', campaign.id)
    .order('created_at', { ascending: false })
    .limit(ADMIN_LIST_LIMIT);
  if (error) {
    if (isTableMissing(error)) return setupNotConfiguredError(res);
    throw error;
  }

  const [prizes, winners] = await Promise.all([
    loadPrizes(campaign.id),
    loadWinners(campaign.id),
  ]);
  const list = entries || [];

  json(res, 200, {
    campaign: {
      id: campaign.id,
      slug: campaign.slug,
      title: campaign.title,
      subtitle: campaign.subtitle,
      intro: campaign.intro,
      opensAt: campaign.opens_at,
      closesAt: campaign.closes_at,
      maxWinners: campaign.max_winners,
      retentionMonths: campaign.retention_months,
      isPublished: campaign.is_published,
      drawCompletedAt: campaign.draw_completed_at,
      ...campaignStatus(campaign),
    },
    prizes: prizes.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      valueLabel: p.value_label,
      imageUrl: p.image_url,
      winnersCount: p.winners_count,
      sortOrder: p.sort_order,
      active: p.active,
    })),
    entries: list.map((e) => ({
      id: e.id,
      firstName: e.first_name,
      email: e.email,
      ageBracket: e.age_bracket,
      guardianEmail: e.guardian_email,
      guardianConsent: e.guardian_consent,
      marketingOptIn: e.marketing_opt_in,
      termsAccepted: e.terms_accepted,
      createdAt: e.created_at,
      answers: e.answers || {},
    })),
    winners,
    results: summarizeAnswers(list),
    stats: {
      entries: list.length,
      entriesTruncated: list.length >= ADMIN_LIST_LIMIT,
      marketingOptIn: list.filter((e) => e.marketing_opt_in).length,
      minors: list.filter((e) => e.age_bracket === 'minor').length,
      winners: winners.length,
      totalPrizeSlots: prizes
        .filter((p) => p.active)
        .reduce((sum, p) => sum + (p.winners_count || 0), 0),
    },
  });
}

async function handleCampaignUpdate(req, res, body) {
  const campaign = await loadCampaign(body.slug || undefined);
  if (!campaign) return json(res, 404, { error: 'Campaign not found' });

  const patch = { updated_at: new Date().toISOString() };
  if (typeof body.title === 'string' && body.title.trim()) patch.title = body.title.trim();
  if (typeof body.subtitle === 'string') patch.subtitle = body.subtitle.trim() || null;
  if (typeof body.intro === 'string') patch.intro = body.intro.trim() || null;
  if (typeof body.opensAt === 'string' && body.opensAt.trim()) {
    patch.opens_at = new Date(body.opensAt).toISOString();
  }
  if (typeof body.closesAt === 'string') {
    patch.closes_at = body.closesAt.trim() ? new Date(body.closesAt).toISOString() : null;
  }
  if (Number.isFinite(Number(body.maxWinners)) && Number(body.maxWinners) > 0) {
    patch.max_winners = Math.trunc(Number(body.maxWinners));
  }
  if (Number.isFinite(Number(body.retentionMonths)) && Number(body.retentionMonths) > 0) {
    patch.retention_months = Math.trunc(Number(body.retentionMonths));
  }
  if (typeof body.isPublished === 'boolean') patch.is_published = body.isPublished;

  const { data, error } = await supabaseAdmin
    .from('survey_campaigns')
    .update(patch)
    .eq('id', campaign.id)
    .select()
    .single();
  if (error) {
    if (isTableMissing(error)) return setupNotConfiguredError(res);
    throw error;
  }
  json(res, 200, { campaign: { id: data.id, ...campaignStatus(data) } });
}

async function handlePrizeWrite(req, res, body) {
  const campaign = await loadCampaign(body.slug || undefined);
  if (!campaign) return json(res, 404, { error: 'Campaign not found' });

  if (body.action === 'delete') {
    const id = typeof body.id === 'string' ? body.id : '';
    if (!id) return json(res, 400, { error: 'id is required' });
    const { error } = await supabaseAdmin
      .from('survey_prizes')
      .delete()
      .eq('id', id)
      .eq('campaign_id', campaign.id);
    if (error) {
      if (isTableMissing(error)) return setupNotConfiguredError(res);
      throw error;
    }
    json(res, 200, { success: true, id });
    return;
  }

  const invalid = validatePrizeInput(body);
  if (invalid) return json(res, 400, { error: invalid });

  if (body.id) {
    const { data, error } = await supabaseAdmin
      .from('survey_prizes')
      .update(buildPrizeRow(body, campaign.id))
      .eq('id', body.id)
      .eq('campaign_id', campaign.id)
      .select()
      .single();
    if (error) {
      if (isTableMissing(error)) return setupNotConfiguredError(res);
      throw error;
    }
    json(res, 200, { prize: data });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('survey_prizes')
    .insert(buildPrizeRow(body, campaign.id))
    .select()
    .single();
  if (error) {
    if (isTableMissing(error)) return setupNotConfiguredError(res);
    throw error;
  }
  json(res, 200, { prize: data });
}

async function handleDraw(req, res, body) {
  const campaign = await loadCampaign(body.slug || undefined);
  if (!campaign) return json(res, 404, { error: 'Campaign not found' });

  const existing = await loadWinners(campaign.id);
  if (existing.length > 0 && body.replace !== true) {
    return json(res, 409, {
      error: 'Winners have already been drawn for this campaign. Send replace: true to run a fresh, audited redraw.',
    });
  }

  const { data: entries, error: entriesError } = await supabaseAdmin
    .from('survey_entries')
    .select('id')
    .eq('campaign_id', campaign.id);
  if (entriesError) {
    if (isTableMissing(entriesError)) return setupNotConfiguredError(res);
    throw entriesError;
  }

  const prizes = (await loadPrizes(campaign.id, true)).filter((p) => (p.winners_count || 0) > 0);
  const slots = [];
  for (const prize of prizes) {
    for (let i = 0; i < (prize.winners_count || 0); i += 1) slots.push(prize.id);
  }
  const maxWinners = Math.max(1, campaign.max_winners || slots.length || 1);
  const totalSlots = Math.min(slots.length, maxWinners);

  const pool = entries || [];
  if (pool.length === 0) return json(res, 400, { error: 'There are no entries to draw from yet.' });
  if (totalSlots === 0) return json(res, 400, { error: 'Add at least one active prize with winners before drawing.' });

  const shuffled = secureShuffle(pool.map((e) => e.id)).slice(0, totalSlots);
  const drawnAt = new Date().toISOString();
  const nonce = crypto.randomBytes(16).toString('hex');
  const proof = crypto
    .createHash('sha256')
    .update([...shuffled].sort().join('|') + '::' + nonce + '::' + drawnAt)
    .digest('hex');

  if (existing.length > 0) {
    const { error: clearError } = await supabaseAdmin
      .from('survey_winners')
      .delete()
      .eq('campaign_id', campaign.id);
    if (clearError) throw clearError;
  }

  const rows = shuffled.map((entryId, index) => ({
    campaign_id: campaign.id,
    entry_id: entryId,
    prize_id: slots[index] || null,
    selected_at: drawnAt,
    selection_method: 'secure_random',
    selection_proof: proof,
    fulfillment_status: 'selected',
  }));

  const { error: insertError } = await supabaseAdmin.from('survey_winners').insert(rows);
  if (insertError) throw insertError;

  const { error: campaignError } = await supabaseAdmin
    .from('survey_campaigns')
    .update({ draw_completed_at: drawnAt, updated_at: drawnAt })
    .eq('id', campaign.id);
  if (campaignError) throw campaignError;

  const winners = await loadWinners(campaign.id);
  json(res, 200, {
    success: true,
    drawnAt,
    selectionProof: proof,
    poolSize: pool.length,
    winnersDrawn: rows.length,
    winners,
  });
}

async function handleWinnerUpdate(req, res, body) {
  const campaign = await loadCampaign(body.slug || undefined);
  if (!campaign) return json(res, 404, { error: 'Campaign not found' });
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return json(res, 400, { error: 'id is required' });

  const allowed = ['selected', 'contacted', 'claimed', 'dispatched', 'collected'];
  const patch = {};
  if (typeof body.fulfillmentStatus === 'string') {
    if (!allowed.includes(body.fulfillmentStatus)) return json(res, 400, { error: 'Unknown winner status' });
    patch.fulfillment_status = body.fulfillmentStatus;
  }
  if (typeof body.notes === 'string') patch.notes = body.notes.trim() || null;
  if (body.markNotified === true) patch.notified_at = new Date().toISOString();
  if (Object.keys(patch).length === 0) return json(res, 400, { error: 'Nothing to update' });

  const { error } = await supabaseAdmin
    .from('survey_winners')
    .update(patch)
    .eq('id', id)
    .eq('campaign_id', campaign.id);
  if (error) {
    if (isTableMissing(error)) return setupNotConfiguredError(res);
    throw error;
  }
  const winners = await loadWinners(campaign.id);
  json(res, 200, { success: true, winners });
}

async function handleExport(res, url) {
  const campaign = await loadCampaign(url.searchParams.get('slug') || undefined);
  if (!campaign) return json(res, 404, { error: 'Campaign not found' });
  const type = url.searchParams.get('type') === 'responses' ? 'responses' : 'entries';

  const { data, error } = await supabaseAdmin
    .from('survey_entries')
    .select('*')
    .eq('campaign_id', campaign.id)
    .order('created_at', { ascending: true })
    .limit(EXPORT_LIMIT);
  if (error) {
    if (isTableMissing(error)) return setupNotConfiguredError(res);
    throw error;
  }

  const headers = type === 'responses' ? RESPONSE_CSV_HEADERS : ENTRY_CSV_HEADERS;
  const csv = toCsv(headers, data || []);
  const stamp = new Date().toISOString().slice(0, 10);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="imc-survey-${type}-${stamp}.csv"`);
  res.end(csv);
}

/* -------------------------------------------------------------------------- */

export async function handleSurveyRequest(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-auth');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url || '/', 'http://localhost');
  const path = url.pathname.replace(/\/+$/, '');

  try {
    // ------------------------------ public ---------------------------------
    if (path === '/api/survey') {
      if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
      await handlePublicGet(req, res, url);
      return;
    }

    if (path === '/api/survey/submit') {
      if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
      await handleSubmit(req, res);
      return;
    }

    if (path === '/api/survey/entry') {
      if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
      await handleGetEntry(req, res, url);
      return;
    }

    // ------------------------------- admin ---------------------------------
    if (path.startsWith('/api/admin/survey')) {
      if (!checkAdminAuth(req)) return json(res, 401, { error: 'Unauthorized' });

      if (path === '/api/admin/survey' && req.method === 'GET') {
        await handleAdminGet(req, res, url);
        return;
      }
      if (path === '/api/admin/survey/export' && req.method === 'GET') {
        await handleExport(res, url);
        return;
      }
      if (path === '/api/admin/survey/campaign' && req.method === 'POST') {
        await handleCampaignUpdate(req, res, await readBody(req));
        return;
      }
      if (path === '/api/admin/survey/prizes' && req.method === 'POST') {
        await handlePrizeWrite(req, res, await readBody(req));
        return;
      }
      if (path === '/api/admin/survey/draw' && req.method === 'POST') {
        await handleDraw(req, res, await readBody(req));
        return;
      }
      if (path === '/api/admin/survey/winners' && req.method === 'POST') {
        await handleWinnerUpdate(req, res, await readBody(req));
        return;
      }
      return json(res, 405, { error: 'Method not allowed' });
    }

    json(res, 404, { error: 'Not found' });
  } catch (err) {
    if (isTableMissing(err)) return setupNotConfiguredError(res);
    const message = (err instanceof Error ? err.message : err && err.message) || 'Server error';
    json(res, 500, { error: message });
  }
}

export default handleSurveyRequest;
