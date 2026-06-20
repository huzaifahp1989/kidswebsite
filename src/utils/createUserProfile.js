import { supabase } from "../lib/supabase";

export async function createUserProfile(user) {
  if (!user || !supabase) return;

  const { data } = await supabase.from("users").select("id").eq("id", user.uid || user.id).maybeSingle();

  if (!data) {
    await supabase.from("users").upsert(
      {
        id: user.uid || user.id,
        email: user.email || "",
        points: 0,
        created_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  }
}
