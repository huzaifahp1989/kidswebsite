import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  ChevronLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { createPageUrl } from "@/utils";
import { supabase } from "@/lib/supabase";
import { listReminders, listDeliveryLogs } from "@/api/reminders";
import { getPushNotificationStatus, initOneSignal } from "@/utils/oneSignal";
import { isAndroidWebView, areAndroidNotificationsEnabled } from "@/utils/androidWebView";
import OneSignal from "react-onesignal";

const CATEGORY_LABELS = {
  daily_islamic: "Daily Islamic",
  morning_adhkar: "Morning Adhkar",
  evening_adhkar: "Evening Adhkar",
  quran_reading: "Quran Reading",
  hifz_revision: "Hifz Revision",
  salah: "Salah",
  friday: "Friday",
  events_competitions: "Events & Competitions",
  new_content: "New Content",
  custom: "Custom",
};

export default function ReminderDiagnostics() {
  const [status, setStatus] = useState({ ready: false, permission: "default", subscribed: false });
  const [externalId, setExternalId] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await initOneSignal();
        const s = await getPushNotificationStatus();
        setStatus(s);
        try {
          const id = await OneSignal.User.getExternalUserId();
          setExternalId(id || null);
        } catch {
          setExternalId(null);
        }
        const [r, l] = await Promise.all([listReminders(), listDeliveryLogs(20)]);
        setReminders(r || []);
        setLogs(l || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const upcoming = [...reminders]
    .filter((r) => r.enabled && r.next_occurrence_at)
    .sort((a, b) => new Date(a.next_occurrence_at) - new Date(b.next_occurrence_at))
    .slice(0, 5);

  const lastSent = [...reminders]
    .filter((r) => r.last_sent_at)
    .sort((a, b) => new Date(b.last_sent_at) - new Date(a.last_sent_at))[0];

  const failures = logs.filter((l) => l.delivery_status === "failed");

  const permLabel = status.permission;
  const permColor =
    permLabel === "granted" ? "bg-emerald-100 text-emerald-700"
    : permLabel === "denied" ? "bg-red-100 text-red-700"
    : "bg-amber-100 text-amber-700";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-3xl font-black text-slate-900">
            <Activity className="h-7 w-7 text-indigo-600" /> Reminder Diagnostics
          </h1>
          <Link to={createPageUrl("ReminderSettings")} className="flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:underline">
            <ChevronLeft className="h-4 w-4" /> Back to settings
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading diagnostics…
          </div>
        ) : (
          <div className="space-y-4">
            {/* Notification permission */}
            <Card>
              <CardHeader><CardTitle className="text-base">Notification permission</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3">
                <Badge className={permColor}>{permLabel}</Badge>
                <span className="text-sm text-slate-600">
                  {status.subscribed ? "Subscribed to push" : "Not subscribed"}
                </span>
                {isAndroidWebView() && (
                  <Badge variant="outline" className="ml-auto">Android WebView</Badge>
                )}
              </CardContent>
            </Card>

            {/* OneSignal status */}
            <Card>
              <CardHeader><CardTitle className="text-base">OneSignal SDK</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Initialized</span>
                  {status.ready ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Push supported</span>
                  <Badge variant="outline">{status.supported ? "Yes" : "No"}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">External user ID</span>
                  <code className="rounded bg-slate-100 px-2 py-0.5 text-xs">{externalId || "— (not linked)"}</code>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming reminders */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4 text-slate-500" /> Upcoming reminders (next 5)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcoming.length === 0 ? (
                  <p className="text-sm text-slate-500">No enabled reminders scheduled.</p>
                ) : (
                  <ul className="space-y-2">
                    {upcoming.map((r) => (
                      <li key={r.id} className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-800">
                          {CATEGORY_LABELS[r.category] || r.category}
                          {r.prayer_name ? ` · ${r.prayer_name}` : ""}
                          {r.title ? ` — ${r.title}` : ""}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(r.next_occurrence_at).toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Last sent */}
            <Card>
              <CardHeader><CardTitle className="text-base">Last reminder sent</CardTitle></CardHeader>
              <CardContent>
                {lastSent ? (
                  <p className="text-sm text-slate-700">
                    <span className="font-semibold">{CATEGORY_LABELS[lastSent.category] || lastSent.category}</span>
                    {lastSent.title ? ` — ${lastSent.title}` : ""}
                    <span className="ml-2 text-xs text-slate-500">
                      at {new Date(lastSent.last_sent_at).toLocaleString()}
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">No reminders sent yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Recent failures */}
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-red-600" /> Recent delivery failures
                </CardTitle>
                <CardDescription>
                  "Sent" means OneSignal accepted the request. Device delivery is not guaranteed by the API.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {failures.length === 0 ? (
                  <p className="text-sm text-slate-500">No recent failures.</p>
                ) : (
                  <ul className="space-y-2">
                    {failures.slice(0, 10).map((f) => (
                      <li key={f.id} className="rounded-md bg-red-50 p-2 text-xs">
                        <span className="font-semibold text-red-800">
                          {new Date(f.scheduled_occurrence).toLocaleString()}
                        </span>
                        <span className="ml-2 text-red-700">{f.error_details}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
