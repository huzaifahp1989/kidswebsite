import { supabase } from "../lib/supabase";

export async function getLeaderboard() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("points", { ascending: false });

  if (error) throw error;

  return (data || []).map((row) => ({
    id: row.id,
    ...row,
  }));
}
