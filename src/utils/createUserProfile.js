import { db } from "../lib/firebase"; 
import { doc, setDoc, getDoc } from "firebase/firestore";

export async function createUserProfile(user) {
  if (!user) return;

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(
      ref,
      {
        email: user.email || "",
        points: 0,
        createdAt: new Date(),
      },
      { merge: true }
    );
  }
}
