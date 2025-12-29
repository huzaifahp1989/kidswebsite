import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signUp, saveUserProfile, resetPassword, getFirebase, sendVerification } from "@/api/firebase";
import { SendEmail } from "@/api/integrations";

// Simple, dependency-free signup form that:
// 1) Creates account with just name, email and password
// 2) Optionally posts the submission to a Google Sheet via an Apps Script Web App endpoint
//    - Configure: VITE_GOOGLE_APPS_SCRIPT_URL in your .env (e.g., https://script.google.com/macros/s/AKfycb.../exec)
//    - Payload: { fullName, email, submittedAt }

export default function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("");
  const [city, setCity] = useState("");
  const [madrasah, setMadrasah] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [profileSaved, setProfileSaved] = useState(null); // null | true | false
  const [infoMsg, setInfoMsg] = useState("");
  const [offerReset, setOfferReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [verificationSent, setVerificationSent] = useState(false);
  const [csrfToken, setCsrfToken] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [loadedAt, setLoadedAt] = useState(0);
  const [formPass, setFormPass] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    setLoadedAt(Date.now());
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    const token = Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
    try {
      document.cookie = `csrf_token=${token}; Path=/; SameSite=Lax`;
    } catch {}
    setCsrfToken(token);
  }, []);

  function validate() {
    const errs = {};
    if (!fullName.trim()) errs.fullName = "Full name is required";
    if (!email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = "Invalid email format";
    if (!password.trim() || password.length < 6) errs.password = "Password must be at least 6 characters";
    if (!age.trim()) errs.age = "Age is required";
    else if (Number(age) < 13) errs.age = "You must be at least 13 years old";
    if (!city.trim()) errs.city = "City is required";
    if (!madrasah.trim()) errs.madrasah = "Madrasah name is required";
    const requiredPass = String(import.meta.env.VITE_SIGNUP_FORM_PASSWORD || "");
    if (requiredPass && formPass.trim() !== requiredPass) errs.formPass = "Form password is incorrect";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    if (!validate()) return;
    setSubmitting(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const user = await signUp(normalizedEmail, password.trim(), { full_name: fullName.trim() });
      // Try sending a verification email to the new user (optional)
      try { await sendVerification(); setVerificationSent(true); } catch {}

      // Account creation succeeded — show success and navigate regardless of profile save
      setSuccess(true);
      setTimeout(() => navigate("/Login"), 1500);

      // Try to persist profile, but do not block success if it fails
      try {
        await saveUserProfile(user.id, {
          fullName: fullName.trim(),
          email: normalizedEmail,
          age: age.trim(),
          city: city.trim(),
          madrasah: madrasah.trim(),
        });
        setProfileSaved(true);
        // Also call backend to ensure record exists and notify admin by email
        try {
          const { auth } = getFirebase();
          const token = await auth?.currentUser?.getIdToken?.();
          if (token) {
            const endpoint = import.meta.env?.DEV ? "/.netlify/functions/signupNotify" : "/api/signupNotify";
            const res = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-CSRF-Token": csrfToken },
              body: JSON.stringify({ email: normalizedEmail, fullName: fullName.trim(), age: Number(age), city: city.trim(), madrasah: madrasah.trim(), loadedAt, submittedAt: Date.now(), honeypot }),
            });
            if (res.ok) {
              const data = await res.json();
              if (data?.notified) setInfoMsg("Admin has been notified of your signup.");
            }
          }
        } catch (_) {}

        const subject = `New Signup Notification - ${new Date().toISOString().slice(0,10)}`;
        const body = `Full Name: ${fullName}\nAge: ${age}\nCity: ${city}\nMadrasah: ${madrasah}\nEmail: ${normalizedEmail}\nSubmitted At: ${new Date().toISOString()}`;
        let attempt = 0;
        let notified = false;
        while (attempt < 3 && !notified) {
          try {
            await SendEmail({ from_name: "Islam Kids Zone", to: "imediac786@gmail.com", subject, body });
            notified = true;
            setInfoMsg(prev => prev || "Admin notified by email.");
          } catch {
            await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
          }
          attempt++;
        }
      } catch (persistErr) {
        // Non-blocking: surface a friendly note if Firestore permissions are missing
        const pCode = persistErr?.code || "";
        let pMsg = persistErr?.message || "Profile save failed.";
        if (pCode === "permission-denied") pMsg = "Profile save requires Firebase access. You can still log in.";
        setProfileSaved(false);
        setInfoMsg(pMsg);
        // Fallback: attempt backend creation and admin notification even if client save failed
        try {
          const { auth } = getFirebase();
          const token = await auth?.currentUser?.getIdToken?.();
          if (token) {
            const endpoint = import.meta.env?.DEV ? "/.netlify/functions/signupNotify" : "/api/signupNotify";
            const res = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-CSRF-Token": csrfToken },
              body: JSON.stringify({ email: normalizedEmail, fullName: fullName.trim(), age: Number(age), city: city.trim(), madrasah: madrasah.trim(), loadedAt, submittedAt: Date.now(), honeypot }),
            });
            if (res.ok) {
              const data = await res.json();
              if (data?.ok) setInfoMsg((prev) => prev || "Your account is registered on the backend.");
            }
          }
        } catch (_) {}
        try {
          const subject = `New Signup Notification - ${new Date().toISOString().slice(0,10)}`;
          const body = `Full Name: ${fullName}\nAge: ${age}\nCity: ${city}\nMadrasah: ${madrasah}\nEmail: ${normalizedEmail}\nSubmitted At: ${new Date().toISOString()}`;
          let attempt = 0;
          let notified = false;
          while (attempt < 3 && !notified) {
            try {
              await SendEmail({ from_name: "Islam Kids Zone", to: "imediac786@gmail.com", subject, body });
              notified = true;
              setInfoMsg(prev => prev || "Admin notified by email.");
            } catch {
              await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
            }
            attempt++;
          }
        } catch {}
      }
    } catch (err) {
      const code = err?.code || "";
      let msg = err?.message || "Signup failed";
      if (code === "auth/email-already-in-use") {
        msg = "Email already in use. Try logging in or reset your password.";
        setOfferReset(true);
        setResetEmail(email.trim().toLowerCase());
      }
      if (code === "auth/invalid-email") msg = "Invalid email address.";
      if (code === "auth/weak-password") msg = "Password is too weak. Use at least 6 characters.";
      if (code === "auth/operation-not-allowed") msg = "Email/password sign-up is disabled. Enable it in Firebase.";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto max-w-xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Sign Up</h1>
      <p className="text-sm text-gray-600 mb-2">
        Create your account and we’ll register you in our backend. You can log in immediately after signing up.
      </p>
      {import.meta.env?.DEV && import.meta.env?.VITE_FIREBASE_PROJECT_ID && (
        <p className="text-xs text-gray-500 mb-6">Using Firebase project: {String(import.meta.env.VITE_FIREBASE_PROJECT_ID)}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 bg-white/50 rounded-lg p-6 shadow">
        <input type="text" className="hidden" autoComplete="off" value={honeypot} onChange={e=>setHoneypot(e.target.value)} />
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="fullName">Full Name</label>
          <input
            id="fullName"
            type="text"
            className="w-full rounded border px-3 py-2 focus:outline-none focus:ring"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g., Aisha Khan"
          />
          {errors.fullName && <div className="text-red-600 text-xs mt-1">{errors.fullName}</div>}
        </div>

        {String(import.meta.env.VITE_SIGNUP_FORM_PASSWORD || "") && (
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="formPass">Form Password</label>
            <input
              id="formPass"
              type="password"
              className="w-full rounded border px-3 py-2 focus:outline-none focus:ring"
              value={formPass}
              onChange={(e) => setFormPass(e.target.value)}
              placeholder="Enter provided password"
            />
            {errors.formPass && <div className="text-red-600 text-xs mt-1">{errors.formPass}</div>}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="age">Age</label>
          <input
            id="age"
            type="number"
            min={13}
            className="w-full rounded border px-3 py-2 focus:outline-none focus:ring"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="e.g., 10"
          />
          {errors.age && <div className="text-red-600 text-xs mt-1">{errors.age}</div>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="city">City</label>
          <input
            id="city"
            type="text"
            className="w-full rounded border px-3 py-2 focus:outline-none focus:ring"
            value={city}
            list="major-cities"
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g., Karachi"
          />
          {errors.city && <div className="text-red-600 text-xs mt-1">{errors.city}</div>}
          <datalist id="major-cities">
            <option value="Karachi" />
            <option value="Lahore" />
            <option value="Islamabad" />
            <option value="Rawalpindi" />
            <option value="Peshawar" />
            <option value="Faisalabad" />
            <option value="Multan" />
            <option value="Hyderabad" />
            <option value="Quetta" />
            <option value="Sialkot" />
            <option value="Gujranwala" />
            <option value="Bahawalpur" />
            <option value="Sukkur" />
          </datalist>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="madrasah">Madrasah Name</label>
          <input
            id="madrasah"
            type="text"
            className="w-full rounded border px-3 py-2 focus:outline-none focus:ring"
            value={madrasah}
            list="madrasah-list"
            onChange={(e) => setMadrasah(e.target.value)}
            placeholder="e.g., Madrasah Al-Huda"
          />
          {errors.madrasah && <div className="text-red-600 text-xs mt-1">{errors.madrasah}</div>}
          <datalist id="madrasah-list">
            <option value="Darul Uloom Karachi" />
            <option value="Jamia Binoria" />
            <option value="Al-Huda" />
            <option value="Jamia Tur Rasheed" />
            <option value="Madrasah Taleem ul Quran" />
          </datalist>
        </div>



        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="w-full rounded border px-3 py-2 focus:outline-none focus:ring"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g., aisha@example.com"
          />
          {errors.email && <div className="text-red-600 text-xs mt-1">{errors.email}</div>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            className="w-full rounded border px-3 py-2 focus:outline-none focus:ring"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
          {errors.password && <div className="text-red-600 text-xs mt-1">{errors.password}</div>}
        </div>

        {errorMsg && <div className="text-red-600 text-sm">{errorMsg}</div>}
        {offerReset && (
          <div className="mt-2 flex items-center gap-2 text-sm">
            <button
              type="button"
              className="text-blue-700 underline"
              onClick={async () => {
                setInfoMsg("");
                try {
                  await resetPassword(resetEmail);
                  setInfoMsg("Password reset email sent. Check your inbox.");
                  setOfferReset(false);
                } catch (e) {
                  const code = e?.code || "";
                  let msg = e?.message || "Failed to send reset email.";
                  if (code === "auth/invalid-email") msg = "Please enter a valid email address.";
                  if (code === "auth/user-not-found") msg = "No account found for this email.";
                  setInfoMsg(msg);
                }
              }}
            >
              Send reset email
            </button>
          </div>
        )}
        {success && <div className="text-green-600 text-sm">Account created! Redirecting to login…</div>}
        {verificationSent && (
          <div className="text-green-700 bg-green-50 border border-green-200 rounded p-2 text-sm">
            Verification email sent. Please check your inbox.
          </div>
        )}
        {profileSaved === false && (
          <div className="text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2 text-sm">
            {infoMsg || "We couldn’t save your profile right now, but your account is created. You can complete your profile after login."}
          </div>
        )}
        {infoMsg && profileSaved !== false && (
          <div className="text-blue-700 bg-blue-50 border border-blue-200 rounded p-2 text-sm">
            {infoMsg}
          </div>
        )}

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
          disabled={submitting}
          >
          {submitting ? "Creating…" : "Create Account"}
        </button>
        <div className="mt-4 text-center">
          <span>Already have an account? </span>
          <a href="/Login" className="text-blue-700 font-semibold">Login</a>
        </div>
      </form>

    </div>
  );
}
