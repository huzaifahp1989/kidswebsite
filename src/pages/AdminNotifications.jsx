import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { oneSignalAdminApi } from "@/api/oneSignalAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Bell,
  CalendarClock,
  Loader2,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react";

const defaultForm = {
  title: "",
  message: "",
  url: "https://imediackids.com/",
  imageUrl: "",
  scheduleEnabled: false,
  sendAfter: "",
  delayedOption: "none",
  deliveryTimeOfDay: "09:00",
};

function toDatetimeLocalValue(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatWhen(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function statusLabel(notification) {
  if (notification.canceled) return "Canceled";
  if (notification.completed_at) return "Sent";
  if (notification.queued_at || notification.send_after) return "Scheduled";
  return "Pending";
}

export default function AdminNotifications() {
  const [form, setForm] = useState(() => ({
    ...defaultForm,
    sendAfter: toDatetimeLocalValue(new Date(Date.now() + 60 * 60 * 1000)),
  }));
  const [status, setStatus] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [statusResult, listResult] = await Promise.all([
        oneSignalAdminApi.getStatus(),
        oneSignalAdminApi.list({ limit: 30 }),
      ]);
      setStatus(statusResult);
      setNotifications(listResult.notifications || []);
    } catch (e) {
      setError(e?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        url: form.url.trim(),
        imageUrl: form.imageUrl.trim(),
        segments: ["All"],
      };

      if (form.scheduleEnabled && form.sendAfter) {
        payload.sendAfter = new Date(form.sendAfter).toISOString();
      }

      if (form.delayedOption === "timezone" || form.delayedOption === "last-active") {
        payload.delayedOption = form.delayedOption;
        if (form.delayedOption === "timezone") {
          payload.deliveryTimeOfDay = form.deliveryTimeOfDay;
        }
      }

      const result = await oneSignalAdminApi.send(payload);
      setSuccess(
        result.scheduled
          ? `Scheduled for ${formatWhen(result.send_after)}. Notification ID: ${result.id}`
          : `Sent to all subscribed users. Recipients: ${result.recipients ?? "n/a"}. ID: ${result.id}`
      );
      setForm((current) => ({
        ...current,
        title: "",
        message: "",
        imageUrl: "",
      }));
      await load();
    } catch (e) {
      setError(e?.message || "Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this scheduled notification?")) return;
    setError("");
    setSuccess("");
    try {
      await oneSignalAdminApi.cancel(id);
      setSuccess("Notification canceled.");
      await load();
    } catch (e) {
      setError(e?.message || "Failed to cancel notification");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 py-8 px-4">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            to={createPageUrl("AdminDashboard")}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
          <Button type="button" variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <Card className="overflow-hidden border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Bell className="h-6 w-6" />
              Push Notifications
            </CardTitle>
            <p className="text-sm text-emerald-50">
              Send or schedule OneSignal push notifications to all subscribed users (web + Android).
            </p>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            {status && (
              <div className="rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {status.configured ? (
                  <>
                    OneSignal API is configured. App ID:{" "}
                    <code className="rounded bg-white px-1.5 py-0.5 text-xs">{status.appId}</code>
                  </>
                ) : (
                  <>
                    Set <code>ONESIGNAL_REST_API_KEY</code> in Vercel / local <code>.env</code> to enable
                    sending. Get it from OneSignal → Settings → Keys &amp; IDs.
                  </>
                )}
              </div>
            )}

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}
            {success ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {success}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="New announcement"
                  required
                  maxLength={65}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Write the notification body..."
                  rows={4}
                  required
                  maxLength={240}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="url">Open URL (optional)</Label>
                  <Input
                    id="url"
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    placeholder="https://imediackids.com/"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imageUrl">Image URL (optional)</Label>
                  <Input
                    id="imageUrl"
                    value={form.imageUrl}
                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="rounded-xl border bg-white p-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label htmlFor="scheduleEnabled" className="text-base">
                      Schedule for later
                    </Label>
                    <p className="text-xs text-gray-500">
                      Leave off to send immediately to all subscribed users.
                    </p>
                  </div>
                  <Switch
                    id="scheduleEnabled"
                    checked={form.scheduleEnabled}
                    onCheckedChange={(checked) => setForm({ ...form, scheduleEnabled: checked })}
                  />
                </div>

                {form.scheduleEnabled ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="sendAfter">Send at</Label>
                      <Input
                        id="sendAfter"
                        type="datetime-local"
                        value={form.sendAfter}
                        onChange={(e) => setForm({ ...form, sendAfter: e.target.value })}
                        required={form.scheduleEnabled}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="delayedOption">Delivery style</Label>
                      <select
                        id="delayedOption"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={form.delayedOption}
                        onChange={(e) => setForm({ ...form, delayedOption: e.target.value })}
                      >
                        <option value="none">Same time for everyone</option>
                        <option value="timezone">Same local time in each timezone</option>
                        <option value="last-active">When user was last active</option>
                      </select>
                    </div>
                    {form.delayedOption === "timezone" ? (
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="deliveryTimeOfDay">Local delivery time</Label>
                        <Input
                          id="deliveryTimeOfDay"
                          type="time"
                          value={form.deliveryTimeOfDay}
                          onChange={(e) => setForm({ ...form, deliveryTimeOfDay: e.target.value })}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  disabled={sending || status?.configured === false}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                >
                  {sending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : form.scheduleEnabled ? (
                    <CalendarClock className="mr-2 h-4 w-4" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {form.scheduleEnabled ? "Schedule notification" : "Send to all users"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Recent notifications</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && !notifications.length ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : notifications.length === 0 ? (
              <p className="text-sm text-gray-500">No notifications yet.</p>
            ) : (
              <div className="space-y-3">
                {notifications.map((item) => {
                  const canCancel =
                    !item.canceled && !item.completed_at && Boolean(item.send_after || item.queued_at);
                  return (
                    <div
                      key={item.id}
                      className="flex flex-col gap-3 rounded-xl border bg-white p-4 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-gray-900">
                            {item.headings?.en || item.contents?.en || "Notification"}
                          </p>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            {statusLabel(item)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {item.contents?.en || "—"}
                        </p>
                        <p className="text-xs text-gray-400">
                          {item.send_after
                            ? `Scheduled: ${formatWhen(item.send_after)}`
                            : `Created: ${formatWhen(item.queued_at || item.completed_at)}`}
                          {typeof item.successful === "number"
                            ? ` · Delivered: ${item.successful}`
                            : ""}
                          {typeof item.converted === "number" ? ` · Clicks: ${item.converted}` : ""}
                        </p>
                      </div>
                      {canCancel ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0 text-red-600 hover:text-red-700"
                          onClick={() => handleCancel(item.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Cancel
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
