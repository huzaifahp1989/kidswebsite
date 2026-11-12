/**
 * Posters shown on the home page come from the "Advertise" app, which keeps them
 * in its own Supabase project. That project's anon key is designed to be public
 * (it is already shipped in that app's browser bundle), so reading the public
 * `posters` table from here is safe — it is a read-only feed of published images.
 */

const POSTERS_SUPABASE_URL =
  import.meta.env.VITE_POSTERS_SUPABASE_URL ||
  "https://bisytxrgpvkxwxhudlmt.supabase.co";

const POSTERS_SUPABASE_ANON_KEY =
  import.meta.env.VITE_POSTERS_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpc3l0eHJncHZreHd4aHVkbG10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NTgyMDYsImV4cCI6MjA4MjUzNDIwNn0.DuSreRopFgk_rVWRCza6XIdvL1dywlhOuAiMqDkQUzg";

/** The posters view of the Advertise app. */
export const POSTERS_PAGE_URL = "https://traeadvert8pia.vercel.app/?view=posters";

/**
 * Reads the newest posters, newest first. Resolves to an empty array whenever the
 * feed is unavailable, so the home page simply shows no slider instead of erroring.
 */
export async function fetchPosters(limit = 12) {
  try {
    const params = new URLSearchParams({
      select: "id,image_url,caption,news,created_at",
      order: "created_at.desc",
      limit: String(limit),
    });
    const res = await fetch(
      `${POSTERS_SUPABASE_URL}/rest/v1/posters?${params.toString()}`,
      {
        headers: {
          apikey: POSTERS_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${POSTERS_SUPABASE_ANON_KEY}`,
        },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data.filter((row) => row && row.image_url) : [];
  } catch {
    return [];
  }
}

/**
 * Records one view against a poster, using the same counter the Advertise app
 * calls, so the figure shown on the posters page grows when a poster is opened
 * here. Best effort: a view that fails to register must never stop the poster
 * from opening, so nothing is thrown and no result is returned.
 */
export async function registerPosterView(posterId) {
  if (!posterId) return;
  try {
    await fetch(`${POSTERS_SUPABASE_URL}/rest/v1/rpc/increment_poster_view`, {
      method: "POST",
      headers: {
        apikey: POSTERS_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${POSTERS_SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_poster_id: posterId }),
    });
  } catch {
    // Ignore — counting a view is never worth interrupting the visitor.
  }
}
