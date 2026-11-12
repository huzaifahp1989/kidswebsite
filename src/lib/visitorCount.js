import { supabase } from "./supabase";

/**
 * Reads the running visitor total for the header badge.
 *
 * It is a read only: the home page's counter is what records the visit, so
 * showing the badge on every page cannot inflate the figure. Resolves to null
 * whenever the counter is unavailable, so callers show "not available"
 * instead of a made-up number.
 */
export async function fetchVisitorTotal() {
  if (!supabase) return null;

  try {
    // A null visitor id means "just tell me the total" — no increment.
    const { data, error } = await supabase.rpc("register_home_visitor", {
      p_visitor_id: null,
    });
    if (error) return null;

    // bigint can arrive as a number or a numeric string depending on size.
    const total = Number(data);
    return Number.isFinite(total) ? total : null;
  } catch {
    return null;
  }
}
