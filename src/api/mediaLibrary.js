import { supabase } from '../lib/supabase';

const BUCKET = 'media';

function isMissingTableError(error, tableName) {
  const message = error?.message || String(error || '');
  return new RegExp(tableName, 'i').test(message) && /schema cache|does not exist|not find/i.test(message);
}

function buildStorageOnlyAsset(payload, storagePath, publicUrl) {
  return {
    id: `storage_${Date.now()}`,
    name: payload.name,
    fileName: payload.file_name,
    storagePath,
    url: publicUrl,
    mimeType: payload.mime_type,
    sizeBytes: payload.size_bytes,
    tags: payload.tags || [],
    folder: payload.folder,
    createdAt: new Date().toISOString(),
  };
}

function sanitizeFileName(name = 'image') {
  return String(name).replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-');
}

function mapMediaRow(row) {
  return {
    id: row.id,
    name: row.name || row.file_name || '',
    fileName: row.file_name,
    storagePath: row.storage_path,
    url: row.public_url,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    tags: row.tags || [],
    folder: row.folder || 'general',
    createdAt: row.created_at,
  };
}

export async function uploadMediaFile(file, options = {}) {
  if (!supabase) throw new Error('Supabase is not configured');
  if (!file) throw new Error('Choose a file to upload');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sign in as admin to upload images');

  const folder = options.folder || 'general';
  const safeName = sanitizeFileName(file.name || 'image');
  const storagePath = `${folder}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    });

  if (uploadError) {
    const message = uploadError.message || String(uploadError);
    if (/bucket not found/i.test(message)) {
      throw new Error(
        'Storage bucket "media" is missing. In Supabase open Storage → New bucket → name: media → turn on Public bucket → Create.'
      );
    }
    throw uploadError;
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  const publicUrl = urlData.publicUrl;

  const payload = {
    name: options.name || file.name || safeName,
    file_name: file.name || safeName,
    storage_path: storagePath,
    public_url: publicUrl,
    mime_type: file.type || null,
    size_bytes: file.size || null,
    tags: options.tags || [],
    folder,
    uploaded_by: user.id,
  };

  const { data, error } = await supabase
    .from('media_assets')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    if (isMissingTableError(error, 'media_assets')) {
      return buildStorageOnlyAsset(payload, storagePath, publicUrl);
    }
    throw error;
  }
  return mapMediaRow(data);
}

export async function searchMediaAssets({ query = '', folder = '', limit = 48 } = {}) {
  if (!supabase) return [];

  let request = supabase
    .from('media_assets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (folder) {
    request = request.eq('folder', folder);
  }

  const trimmed = query.trim();
  if (trimmed) {
    const pattern = `%${trimmed.replace(/,/g, '')}%`;
    request = request.or(`name.ilike.${pattern},file_name.ilike.${pattern},folder.ilike.${pattern}`);
  }

  const { data, error } = await request;
  if (error) {
    if (isMissingTableError(error, 'media_assets')) {
      return [];
    }
    throw error;
  }
  return (data || []).map(mapMediaRow);
}

export async function deleteMediaAsset(id) {
  if (!supabase) throw new Error('Supabase is not configured');

  const { data: row, error: fetchError } = await supabase
    .from('media_assets')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (fetchError && !isMissingTableError(fetchError, 'media_assets')) throw fetchError;
  if (!row) return { ok: true };

  if (row.storage_path) {
    await supabase.storage.from(BUCKET).remove([row.storage_path]);
  }

  const { error } = await supabase.from('media_assets').delete().eq('id', id);
  if (error && !isMissingTableError(error, 'media_assets')) throw error;
  return { ok: true };
}

export async function uploadSponsorImage(file, label = 'sponsor') {
  const asset = await uploadMediaFile(file, { folder: 'sponsors', name: label });
  return { url: asset.url, id: asset.id };
}
