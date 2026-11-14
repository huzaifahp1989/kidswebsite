import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Lock, CheckCircle2, AlertTriangle } from "lucide-react";
import { adminSignIn, adminSignOut, isAdminUser, hasAdminSession, getFirebase, resetPassword } from "@/api/firebase";
import { createPageUrl } from "@/utils";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const envFlags = {
    supabaseUrl: Boolean(import.meta.env.VITE_SUPABASE_URL),
    supabaseKey: Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY),
  };

  const debugConfig = {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL || "",
    supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
  };
  const mask = (s, start = 4, end = 4) => {
    if (!s) return "(empty)";
    if (s.length <= start + end) return s;
    return `${s.slice(0, start)}…${s.slice(-end)}`;
  };

  // This page deliberately never navigates on its own. It used to watch the auth
  // state and jump to /AdminDashboard as soon as any session was found in
  // storage. In the app that fired a second or two after the page opened — while
  // the email was being typed — so the sign-in form kept vanishing before it
  // could be filled in (and the guard could hand the visitor straight back,
  // which looked like the page reloading in a loop). The form now always stays
  // put; a signed-in admin is routed to the dashboard from `handleLogin` below.
  const configured = Boolean(getFirebase().app);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (!configured) throw new Error("Supabase is not configured");
      await adminSignIn(email, password);
      // Removed optional static 2FA code gate; sign-in proceeds with email/password only
      // The sign-in has just written the session to storage, so the lock-free check
      // answers instantly. Only fall back to the async check — and only sign the
      // visitor out for a definitive "no", never for a timed-out lookup.
      const ok = hasAdminSession() || (await isAdminUser());
      if (!ok) {
        await adminSignOut();
        throw new Error("Access restricted to admin only");
      }
      navigate(createPageUrl("AdminDashboard"));
    } catch (err) {
      // Map common Supabase auth errors to friendly messages
      const code = err?.code || "";
      let msg = err?.message || "Login failed";
      if (code === "invalid_credentials") msg = "Invalid email or password. Please try again or reset your password.";
      if (code === "email_not_confirmed") msg = "Please confirm your email address before signing in.";
      if (code === "user_not_found") msg = "No account found for this email. Ask an admin to create one.";
      if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit") msg = "Too many attempts. Please wait a minute, then try again.";
      if (code === "email_provider_disabled") msg = "Email/password sign-in is disabled. Enable it in Supabase Auth.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-md mx-auto">
        <Card className="shadow-xl border-2 border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" /> Secure Admin Login
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {!configured ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="w-5 h-5" />
                  <span>Supabase is not configured.</span>
                </div>
                <p className="text-sm text-gray-600">
                  Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in <code>.env</code>.
                  Optional: <code>VITE_ADMIN_EMAIL</code> for admin-only access.
                </p>
                <div className="text-xs text-gray-500 bg-gray-50 border rounded p-2">
                  <div className="font-semibold mb-1">Detected env flags:</div>
                  <ul className="list-disc ml-4">
                    <li>VITE_SUPABASE_URL: {envFlags.supabaseUrl ? '✓' : '✗'}</li>
                    <li>VITE_SUPABASE_ANON_KEY: {envFlags.supabaseKey ? '✓' : '✗'}</li>
                  </ul>
                  <div className="mt-2">After editing <code>.env</code>, restart the dev server.</div>
                </div>
                <div className="text-xs text-gray-500 bg-gray-50 border rounded p-2">
                  <div className="font-semibold mb-1">Debug config (masked)</div>
                  <ul className="list-disc ml-4">
                    <li>supabaseUrl: {debugConfig.supabaseUrl || '(empty)'}</li>
                    <li>anonKey: {mask(debugConfig.supabaseKey)}</li>
                  </ul>
                </div>
                <div className="text-sm text-gray-600">
                  Admin login uses Supabase email/password auth.
                </div>
              </div>
            ) : (
              <>
              <div className="text-xs text-gray-500 bg-gray-50 border rounded p-2 mb-4">
                <div className="font-semibold mb-1">Supabase project</div>
                <ul className="list-disc ml-4">
                  <li>url: {debugConfig.supabaseUrl || '(empty)'}</li>
                  <li>anonKey: {mask(debugConfig.supabaseKey)}</li>
                </ul>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <div className="p-2 rounded bg-red-50 text-red-700 text-sm">{error}</div>
                )}
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                {/* 2FA removed */}
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Signing in..." : (
                    <span className="inline-flex items-center gap-2"><Lock className="w-4 h-4" />Sign In</span>
                  )}
                </Button>
                <div className="flex items-center justify-between text-xs mt-2">
                  <button
                    type="button"
                    className="text-blue-600 hover:underline"
                    onClick={async () => {
                      setError("");
                      try {
                        if (!email) throw new Error("Enter your email above, then click reset.");
                        await resetPassword(email);
                        setError("Password reset email sent. Check your inbox.");
                      } catch (err) {
                        const code = err?.code || "";
                        let msg = err?.message || "Failed to send reset email.";
                        if (code === "auth/invalid-email") msg = "Please enter a valid email address.";
                        if (code === "auth/user-not-found") msg = "No account found for this email.";
                        setError(msg);
                      }
                    }}
                  >
                    Forgot password?
                  </button>
                  <span className="text-gray-500 flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-600" /> Access available to any signed-in user</span>
                </div>
              </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
