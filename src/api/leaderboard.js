import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";

export async function getLeaderboard() {
  const q = query(collection(db, "users"), orderBy("points", "desc"));
  const snap = await getDocs(q);

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}
