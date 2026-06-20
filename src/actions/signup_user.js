import { supabase } from "../lib/supabase";

export default async function signup_user(email, password, fullName) {
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    const user = data.user;
    await supabase.from("users").upsert(
      {
        id: user.id,
        full_name: fullName,
        email: user.email,
        points: 0,
        created_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    return {
      success: true,
      uid: user.id,
      email: user.email,
    };
  } catch (error) {
    console.error("Signup Error:", error);
    return {
      success: false,
      message: error.message,
    };
  }
}
