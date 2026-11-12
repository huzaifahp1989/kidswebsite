import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { getFirebase, watchAuth, hasAdminSession, isAdminUser } from "@/api/firebase";
import { createPageUrl } from "@/utils";

/**
 * Gates the admin pages behind the signed-in admin account.
 *
 * The decision is taken from the session persisted in localStorage rather than
 * from `supabase.auth.getUser()`. Both `getUser()` and the initial
 * `onAuthStateChange` callback have to wait on a browser-wide lock
 * (`lock:sb-<ref>-auth-token`). When another document holds that lock neither
 * ever settles, so the old version never finished checking and every admin page
 * came up blank.
 *
 * A signed-in admin now lands on the page straight away, and the guard only
 * redirects once the session is genuinely gone.
 */
export default function AdminGuard({ children }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let active = true;
    let unsub = () => {};
    let timer = null;

    const finish = (allowed) => {
      if (!active) return;
      if (timer) {
        window.clearTimeout(timer);
        timer = null;
      }
      setStatus(allowed ? "allowed" : "denied");
    };

    const evaluate = async () => {
      // Fast path: a session in storage is enough, and it never waits on the auth
      // lock, so a signed-in admin sees the page immediately.
      if (hasAdminSession()) {
        finish(true);
        return;
      }

      // Slow path: fall back to the exact check `AdminLogin` uses. The two used to
      // differ, and a disagreement made the pages bounce off each other forever —
      // the admin area kept re-routing and nothing could be clicked.
      let allowed = false;
      try {
        allowed = await isAdminUser();
      } catch (error) {
        console.error("AdminGuard: admin check failed", error);
      }
      finish(allowed);
    };

    const { app } = getFirebase();
    if (!app) {
      // Supabase is not configured at all — there is no admin area to reach.
      setStatus("denied");
      navigate(createPageUrl("Home"));
      return undefined;
    }

    // Decide immediately. `watchAuth` must never be the only trigger: its first
    // callback waits on the same auth lock as `getUser()`.
    evaluate();

    // Keeps the guard honest afterwards (sign-out elsewhere, token refresh).
    unsub = watchAuth(evaluate);

    // Last resort. Generous on purpose: a slow check must not bounce a signed-in
    // admin off the page.
    timer = window.setTimeout(evaluate, 30000);

    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
      unsub();
    };
  }, [navigate]);

  useEffect(() => {
    if (status === "denied" && getFirebase().app) {
      navigate(createPageUrl("AdminLogin"));
    }
  }, [status, navigate]);

  if (status === "checking") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2
          className="h-6 w-6 animate-spin text-[#1e3a8a]"
          aria-label="Checking admin access"
        />
      </div>
    );
  }

  if (status === "denied") return null;
  return children;
}

AdminGuard.propTypes = {
  children: PropTypes.node,
};
