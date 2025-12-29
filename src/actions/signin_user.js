import { auth } from "../lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

export default async function signin_user(email, password) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const user = result.user;

    return {
      success: true,
      uid: user.uid,
      email: user.email,
    };

  } catch (error) {
    console.error("Signin Error:", error);
    return { success: false, message: error.message };
  }
}
