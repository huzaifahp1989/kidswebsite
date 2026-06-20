import { supabase } from "../lib/supabase";

export default async function signin_user(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    return {
      success: true,
      uid: data.user.id,
      email: data.user.email,
    };
  } catch (error) {
    console.error("Signin Error:", error);
    return { success: false, message: error.message };
  }
}
