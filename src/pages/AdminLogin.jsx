import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Lock, CheckCircle2, AlertTriangle } from "lucide-react";
import { adminSignIn, adminSignOut, watchAuth, isAdminUser, getFirebase, resetPassword } from "@/api/firebase";
import { createPageUrl } from "@/utils";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(false);
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

  useEffect(() => {
    const { app } = getFirebase();
    setConfigured(Boolean(app));
    const unsub = watchAuth(async (user) => {
      if (user) {
        const ok = await isAdminUser();
        if (ok) navigate(createPageUrl("AdminDashboard"));
      }
    });
    return () => unsub && unsub();
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (!configured) throw new Error("Supabase is not configured");
      const user = await adminSignIn(email, password);
      // Removed optional static 2FA code gate; sign-in proceeds with email/password only
      const ok = await isAdminUser();
      if (!ok) {
        await adminSignOut();
        throw new Error("Access restricted to admin only");
      }
      navigate(createPageUrl("AdminDashboard"));
    } catch (err) {
      // Map common Firebase auth errors to friendly messages
      const code = err?.code || "";
      let msg = err?.message || "Login failed";
      if (code === "auth/invalid-credential") msg = "Invalid email or password. Please try again or reset your password.";
      if (code === "auth/user-not-found") msg = "No account found for this email. Please sign up or ask an admin to create one.";
      if (code === "auth/wrong-password") msg = "Incorrect password. Try again or reset your password.";
      if (code === "auth/too-many-requests") msg = "Too many attempts. Please wait a minute, then try again.";
      if (code === "auth/operation-not-allowed") msg = "Email/password sign-in is disabled. Enable it in Supabase Auth.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || "";

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
