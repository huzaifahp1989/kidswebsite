import { supabase } from '../lib/supabase';

const BUCKET = 'media';

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

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  const payload = {
    name: options.name || file.name || safeName,
    file_name: file.name || safeName,
    storage_path: storagePath,
    public_url: urlData.publicUrl,
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

  if (error) throw error;
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
  if (error) throw error;
  return (data || []).map(mapMediaRow);
}

export async function deleteMediaAsset(id) {
  if (!supabase) throw new Error('Supabase is not configured');

  const { data: row, error: fetchError } = await supabase
    .from('media_assets')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!row) return { ok: true };

  if (row.storage_path) {
    await supabase.storage.from(BUCKET).remove([row.storage_path]);
  }

  const { error } = await supabase.from('media_assets').delete().eq('id', id);
  if (error) throw error;
  return { ok: true };
}

export async function uploadSponsorImage(file, label = 'sponsor') {
  const asset = await uploadMediaFile(file, { folder: 'sponsors', name: label });
  return { url: asset.url, id: asset.id };
}
