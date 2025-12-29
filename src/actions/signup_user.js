import { auth, db } from "../lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export default async function signup_user(email, password, fullName) {
  try {
    // Create Firebase Auth user
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const user = result.user;

    // Create Firestore user document
    await setDoc(doc(db, "users", user.uid), {
      full_name: fullName,
      email: user.email,
      points: 0,
      created_at: new Date(),
    });

    return {
      success: true,
      uid: user.uid,
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
