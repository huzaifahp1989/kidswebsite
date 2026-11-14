import React, { useEffect, useMemo, useState } from "react";
import {
  BellRing,
  Sunrise,
  Sunset,
  BookOpen,
  Brain,
  Landmark,
  CalendarDays,
  Trophy,
  Music,
  ListChecks,
  MapPin,
  Clock,
  Save,
  Send,
  AlertTriangle,
  Loader2,
  Plus,
  Trash2,
  Settings2,
  Gamepad2,
  Heart,
  Headphones,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

import { createPageUrl } from "@/utils";
import { supabase } from "@/lib/supabase";
import {
  listReminders,
  upsertReminder,
  deleteReminder,
  sendTestNotification,
} from "@/api/reminders";
import { getNextReminderAtWithDays, getNextSalahOccurrence } from "@/utils/reminderSchedule";
import { getReminderIdentity, getImmediateReminderIdentity } from "@/utils/oneSignal";
import {
  isAndroidReminderBridgeAvailable,
  areAndroidNotificationsEnabled,
  openAndroidNotificationSettings,
  scheduleAndroidReminder,
  cancelAndroidReminder,
  showAndroidTestNotification,
} from "@/utils/androidWebView";

// ---------------------------------------------------------------------------
// Category definitions
// ---------------------------------------------------------------------------
const BUILTIN_CATEGORIES = [
  { id: "daily_islamic", label: "Daily Islamic reminders", icon: ListChecks, color: "text-emerald-600", defaultTime: "08:00" },
  { id: "morning_adhkar", label: "Morning adhkar", icon: Sunrise, color: "text-amber-600", defaultTime: "06:00" },
  { id: "evening_adhkar", label: "Evening adhkar", icon: Sunset, color: "text-indigo-600", defaultTime: "18:00" },
  { id: "quran_reading", label: "Daily Quran reading", icon: BookOpen, color: "text-sky-600", defaultTime: "07:00" },
  { id: "hifz_revision", label: "Hifz revision", icon: Brain, color: "text-violet-600", defaultTime: "20:00" },
  { id: "friday", label: "Friday Islamic reminders", icon: CalendarDays, color: "text-rose-600", defaultTime: "11:00" },
  { id: "events_competitions", label: "Islamic events & competitions", icon: Trophy, color: "text-orange-600", defaultTime: "09:00" },
  { id: "new_content", label: "New recitations, nasheeds & talks", icon: Music, color: "text-pink-600", defaultTime: "12:00" },
  { id: "kids_quiz", label: "Kids Zone quiz & games", icon: Gamepad2, color: "text-fuchsia-600", defaultTime: "16:00" },
  { id: "durood", label: "Recite Durood Shareef", icon: Heart, color: "text-rose-600", defaultTime: "13:00" },
  { id: "quran_listen", label: "Listen to Quran (earn points)", icon: Headphones, color: "text-cyan-600", defaultTime: "21:00" },
];

const SALAH_PRAYERS = [
  { id: "fajr", label: "Fajr" },
  { id: "dhuhr", label: "Dhuhr" },
  { id: "asr", label: "Asr" },
  { id: "maghrib", label: "Maghrib" },
  { id: "isha", label: "Isha" },
];

const CALCULATION_METHODS = [
  { id: 3, label: "Muslim World League (MWL)" },
  { id: 1, label: "University of Islamic Sciences, Karachi" },
  { id: 2, label: "Islamic Society of North America (ISNA)" },
  { id: 4, label: "Umm Al-Qura University, Makkah" },
  { id: 5, label: "Egyptian General Authority of Survey" },
];

const DAYS = [
  { id: 0, label: "Sun" },
  { id: 1, label: "Mon" },
  { id: 2, label: "Tue" },
  { id: 3, label: "Wed" },
  { id: 4, label: "Thu" },
  { id: 5, label: "Fri" },
  { id: 6, label: "Sat" },
];

// Sound each reminder rings with on the device (Android app). Radix' Select
// rejects empty-string values, so "silent" is a sentinel mapped to "" on save.
const ALARM_SOUNDS = [
  { id: "SYSTEM_ALARM", label: "System alarm" },
  { id: "SYSTEM_NOTIFICATION", label: "System notification" },
  { id: "SYSTEM_RINGTONE", label: "System ringtone" },
  { id: "SILENT", label: "Silent (notification only)" },
];

const DEFAULT_SOUND = "SYSTEM_ALARM";

const soundToOption = (sound) => (sound ? String(sound) : "SILENT");
const optionToSound = (option) => (option === "SILENT" ? "" : option);

const DEFAULT_TITLES = {
  daily_islamic: "Daily Islamic Reminder",
  morning_adhkar: "Morning Adhkar",
  evening_adhkar: "Evening Adhkar",
  quran_reading: "Quran Reading Reminder",
  hifz_revision: "Hifz Revision Reminder",
  friday: "Friday Islamic Reminder",
  events_competitions: "Islamic Events & Competitions",
  new_content: "New Content Available",
  kids_quiz: "Kids Zone Quiz Time",
  durood: "Recite Durood Shareef",
  quran_listen: "Listen to the Quran",
};

const DEFAULT_MESSAGES = {
  daily_islamic: "A moment of reflection and remembrance awaits you today.",
  morning_adhkar: "Time for your morning remembrance of Allah. Start your day with dhikr.",
  evening_adhkar: "Time for your evening remembrance of Allah. End your day with dhikr.",
  quran_reading: "Read a portion of the Quran today to keep your daily habit.",
  hifz_revision: "Revise your memorised verses today to strengthen your hifz.",
  friday: "Remember the blessings of Friday. Send blessings upon the Prophet ﷺ.",
  events_competitions: "Check out the latest Islamic events and competitions.",
  new_content: "New recitations, nasheeds or talks are available for you.",
  kids_quiz: "Time for the Kids Zone quiz! Earn points while learning about Islam.",
  durood: "Send blessings upon the Prophet ﷺ. Recite Durood Shareef now.",
  quran_listen: "Listen to a beautiful recitation of the Quran and earn reward points.",
};

const DEFAULT_TZ =
  (typeof Intl !== "undefined" && Intl.DateTimeFormat().resolvedOptions().timeZone) || "UTC";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getUser() {
  return supabase?.auth?.getUser?.() || Promise.resolve({ data: { user: null } });
}

function parseHourMinute(time) {
  const [h, m] = String(time || "").slice(0, 5).split(":").map(Number);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return null;
  return { hour: h, minute: m };
}

/**
 * Mirrors a saved reminder into the Android app's on-device scheduler so it
 * fires as a real notification — no push subscription, Firebase or network
 * needed. No-op on the web.
 */
function syncAndroidReminder(row) {
  if (!row || !isAndroidReminderBridgeAvailable()) return;
  const key = row.id || row.category;
  if (!key) return;
  const time = parseHourMinute(row.reminder_time);
  if (!row.enabled || !time) {
    cancelAndroidReminder(key);
    return;
  }
  scheduleAndroidReminder({
    key,
    title: row.title,
    message: row.message,
    hour: time.hour,
    minute: time.minute,
    days: Array.isArray(row.days_of_week) ? row.days_of_week : null,
    sound: row.sound ?? DEFAULT_SOUND,
  });
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function ReminderSettings() {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(null);
  const [timeZone, setTimeZone] = useState(DEFAULT_TZ);
  const [user, setUser] = useState(null);
  const [osId, setOsId] = useState(null);
  const [nativeNotifEnabled, setNativeNotifEnabled] = useState(null);

  // Salah location state
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [method, setMethod] = useState(3);
  const [locating, setLocating] = useState(false);

  // Custom reminder dialog
  const [customOpen, setCustomOpen] = useState(false);
  const [customForm, setCustomForm] = useState({ title: "", message: "", time: "09:00", days: [], sound: DEFAULT_SOUND, editId: null });

  useEffect(() => {
    async function init() {
      // Set a device identity synchronously so reminders can be saved or tested
      // straight away. Waiting for OneSignal to initialise (which can be slow,
      // and is blocked on this origin) left this null long enough to wrongly
      // show "enable notifications or sign in first".
      setOsId(getImmediateReminderIdentity());
      const { data } = await getUser();
      setUser(data?.user || null);
      // Refine with the OneSignal subscription ID once it is available.
      const identity = await getReminderIdentity();
      if (identity) setOsId(identity);
    }
    init();
    loadReminders();
  }, []);

  // Track whether Android is actually allowing reminders (they are silently
  // dropped when the user has blocked the app's notifications).
  useEffect(() => {
    if (!isAndroidReminderBridgeAvailable()) return undefined;
    const refresh = () => setNativeNotifEnabled(areAndroidNotificationsEnabled());
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  async function loadReminders() {
    setLoading(true);
    try {
      const rows = await listReminders();
      setReminders(rows || []);
      // Re-arm every enabled reminder on app open — OS alarms are cleared by a
      // reboot, so the app re-registers them each launch.
      (rows || []).forEach((row) => {
        if (row.category !== "salah") syncAndroidReminder(row);
      });
      const salahRow = rows.find((r) => r.category === "salah");
      if (salahRow) {
        setLat(salahRow.location_lat != null ? String(salahRow.location_lat) : "");
        setLng(salahRow.location_lng != null ? String(salahRow.location_lng) : "");
        setMethod(salahRow.calculation_method || 3);
        setTimeZone(salahRow.time_zone || DEFAULT_TZ);
      }
    } catch (err) {
      toast.error("Could not load reminders: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // Find an existing reminder for a built-in category
  const getBuiltin = (category) => reminders.find((r) => r.category === category);
  const getSalah = (prayer) => reminders.find((r) => r.category === "salah" && r.prayer_name === prayer);

  async function saveBuiltin(category, patch) {
    if (!user && !osId) { toast.error("Please enable notifications or sign in first."); return; }
    setSaving(true);
    try {
      const existing = getBuiltin(category);
      const row = {
        id: existing?.id,
        user_id: user?.id || null,
        onesignal_id: osId,
        category,
        title: patch.title ?? existing?.title ?? DEFAULT_TITLES[category],
        message: patch.message ?? existing?.message ?? DEFAULT_MESSAGES[category],
        reminder_time: patch.time ?? existing?.reminder_time?.slice?.(0, 5) ?? BUILTIN_CATEGORIES.find((c) => c.id === category).defaultTime,
        time_zone: timeZone,
        days_of_week: patch.days ?? existing?.days_of_week ?? null,
        enabled: patch.enabled ?? existing?.enabled ?? true,
        sound: patch.sound ?? existing?.sound ?? DEFAULT_SOUND,
        next_occurrence_at: existing?.next_occurrence_at,
      };
      // Compute next occurrence if enabled
      if (row.enabled && row.reminder_time) {
        row.next_occurrence_at = getNextReminderAtWithDays(row.reminder_time, row.time_zone, row.days_of_week);
      }
      const saved = await upsertReminder(row);
      syncAndroidReminder(saved);
      setReminders((prev) => {
        const idx = prev.findIndex((r) => r.id === saved.id || (r.category === category && !r.prayer_name));
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [...prev, saved];
      });
      toast.success("Reminder saved.");
    } catch (err) {
      toast.error("Save failed: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleBuiltin(category, enabled) {
    const existing = getBuiltin(category);
    await saveBuiltin(category, { enabled });
  }

  async function handleTest(category) {
    setTesting(category);
    try {
      // In the Android app push can't reach the WebView, so fire a real local
      // notification from the on-device scheduler instead.
      if (isAndroidReminderBridgeAvailable()) {
        showAndroidTestNotification(
          DEFAULT_TITLES[category] || "Reminder",
          DEFAULT_MESSAGES[category] || "This is a test reminder."
        );
        toast.success("Test notification sent. Check your notifications.");
        return;
      }
      await sendTestNotification(category);
      toast.success("Test notification sent. Check your device.");
    } catch (err) {
      toast.error("Test failed: " + err.message);
    } finally {
      setTesting(null);
    }
  }

  // ---- Salah ----
  async function detectLocation() {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setLocating(false);
        toast.success("Location detected.");
      },
      () => {
        toast.error("Could not get location. Enter coordinates manually.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function fetchPrayerTimes(latitude, longitude, methodId) {
    const url = `https://api.aladhan.com/v1/timings?latitude=${latitude}&longitude=${longitude}&method=${methodId}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Prayer times API failed");
    const json = await res.json();
    return json.data?.timings || {};
  }

  async function saveSalahLocation() {
    if (!user && !osId) { toast.error("Please enable notifications or sign in first."); return; }
    if (!lat || !lng) {
      toast.error("Enter latitude and longitude first.");
      return;
    }
    setSaving(true);
    try {
      const timings = await fetchPrayerTimes(lat, lng, method);
      const localDate = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
      const prayerTimes = { [localDate]: timings };
      // Upsert a "salah config" row (prayer_name = null) holding location + times
      const existingConfig = reminders.find((r) => r.category === "salah" && !r.prayer_name);
      const configRow = {
        id: existingConfig?.id,
        user_id: user?.id || null,
        onesignal_id: osId,
        category: "salah",
        title: "Salah Reminders",
        message: "",
        time_zone: timeZone,
        enabled: true,
        location_lat: Number(lat),
        location_lng: Number(lng),
        calculation_method: method,
        prayer_times: prayerTimes,
        next_occurrence_at: existingConfig?.next_occurrence_at,
      };
      const saved = await upsertReminder(configRow);
      setReminders((prev) => {
        const idx = prev.findIndex((r) => r.id === saved.id);
        if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n; }
        return [...prev, saved];
      });
      toast.success("Prayer times saved for " + localDate + ".");
    } catch (err) {
      toast.error("Could not fetch prayer times: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleSalah(prayer, enabled) {
    if (!user && !osId) { toast.error("Please enable notifications or sign in first."); return; }
    setSaving(true);
    try {
      const configRow = reminders.find((r) => r.category === "salah" && !r.prayer_name);
      if (!configRow?.prayer_times) {
        toast.error("Set your location and save prayer times first.");
        setSaving(false);
        return;
      }
      const existing = getSalah(prayer);
      const row = {
        id: existing?.id,
        user_id: user?.id || null,
        onesignal_id: osId,
        category: "salah",
        prayer_name: prayer,
        title: `${SALAH_PRAYERS.find((p) => p.id === prayer).label} Prayer Reminder`,
        message: `${SALAH_PRAYERS.find((p) => p.id === prayer).label} prayer time is approaching.`,
        time_zone: timeZone,
        enabled,
        minutes_before: existing?.minutes_before ?? 10,
        prayer_times: configRow.prayer_times,
        next_occurrence_at: existing?.next_occurrence_at,
      };
      if (enabled) {
        const next = getNextSalahOccurrence(configRow.prayer_times, prayer, row.minutes_before, timeZone);
        if (next) row.next_occurrence_at = next;
      }
      const saved = await upsertReminder(row);
      setReminders((prev) => {
        const idx = prev.findIndex((r) => r.id === saved.id);
        if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n; }
        return [...prev, saved];
      });
      toast.success(`${SALAH_PRAYERS.find((p) => p.id === prayer).label} reminder ${enabled ? "enabled" : "disabled"}.`);
    } catch (err) {
      toast.error("Save failed: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function setMinutesBefore(prayer, mins) {
    const existing = getSalah(prayer);
    if (!existing) return;
    setSaving(true);
    try {
      const configRow = reminders.find((r) => r.category === "salah" && !r.prayer_name);
      const row = { ...existing, minutes_before: mins };
      if (existing.enabled && configRow?.prayer_times) {
        const next = getNextSalahOccurrence(configRow.prayer_times, prayer, mins, timeZone);
        if (next) row.next_occurrence_at = next;
      }
      const saved = await upsertReminder(row);
      setReminders((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  // ---- Custom reminders ----
  const customReminders = reminders.filter((r) => r.category === "custom");

  function openCustom(reminder) {
    if (reminder) {
      setCustomForm({
        title: reminder.title,
        message: reminder.message,
        time: reminder.reminder_time?.slice?.(0, 5) || "09:00",
        days: reminder.days_of_week || [],
        sound: reminder.sound || DEFAULT_SOUND,
        editId: reminder.id,
      });
    } else {
      setCustomForm({ title: "", message: "", time: "09:00", days: [], sound: DEFAULT_SOUND, editId: null });
    }
    setCustomOpen(true);
  }

  async function saveCustom() {
    if (!user && !osId) { toast.error("Please enable notifications or sign in first."); return; }
    if (!customForm.title.trim()) {
      toast.error("Title is required.");
      return;
    }
    setSaving(true);
    try {
      const row = {
        id: customForm.editId,
        user_id: user?.id || null,
        onesignal_id: osId,
        category: "custom",
        title: customForm.title,
        message: customForm.message || "You have a scheduled reminder.",
        reminder_time: customForm.time,
        time_zone: timeZone,
        days_of_week: customForm.days.length ? customForm.days : null,
        enabled: true,
        sound: customForm.sound,
        next_occurrence_at: getNextReminderAtWithDays(customForm.time, timeZone, customForm.days.length ? customForm.days : null),
      };
      const saved = await upsertReminder(row);
      syncAndroidReminder(saved);
      setReminders((prev) => {
        const idx = prev.findIndex((r) => r.id === saved.id);
        if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n; }
        return [...prev, saved];
      });
      setCustomOpen(false);
      toast.success("Custom reminder saved.");
    } catch (err) {
      toast.error("Save failed: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeCustom(id) {
    setSaving(true);
    try {
      await deleteReminder(id);
      cancelAndroidReminder(id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
      toast.success("Custom reminder deleted.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/40">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-black text-slate-900">
              <BellRing className="h-7 w-7 text-indigo-600" />
              Reminder Settings
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Configure your daily Islamic reminders. They are sent server-side even when the app is closed.
            </p>
          </div>
          <Link
            to={createPageUrl("Home")}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Home
          </Link>
        </div>

        {/* Anonymous user banner */}
        {!user && osId && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertTriangle className="h-5 w-5 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900">Using reminders without an account</p>
                <p className="text-xs text-slate-600">
                  Your reminders are linked to this browser/device. For cross-device access and to keep your reminders if you clear browser data, <Link to={createPageUrl("Login")} className="font-semibold text-blue-700 underline">sign in</Link>.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Android: reminders are silently dropped while notifications are off */}
        {nativeNotifEnabled === false && (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardContent className="flex items-center gap-3 py-4">
              <BellRing className="h-5 w-5 shrink-0 text-amber-600" />
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900">Notifications are turned off</p>
                <p className="text-xs text-slate-600">
                  Android is blocking reminders for this app. Turn them back on to receive your reminders.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => openAndroidNotificationSettings()}>
                Open settings
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Global controls: timezone */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-slate-700" /> Your time zone
            </CardTitle>
            <CardDescription>All reminder times use this time zone.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-xs">
              <Select value={timeZone} onValueChange={setTimeZone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["UTC", "Europe/London", "America/New_York", "America/Chicago", "America/Los_Angeles", "Asia/Dubai", "Asia/Riyadh", "Asia/Karachi", "Asia/Kolkata", "Asia/Dhaka", "Asia/Shanghai", "Australia/Sydney", "Africa/Cairo", "Africa/Lagos"].map((tz) => (
                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading reminders…
          </div>
        ) : (
          <div className="space-y-4">
            {/* Built-in categories */}
            {BUILTIN_CATEGORIES.map((cat) => {
              const existing = getBuiltin(cat.id);
              const enabled = existing?.enabled ?? false;
              const Icon = cat.icon;
              return (
                <Card key={cat.id} className={enabled ? "border-indigo-200" : "border-slate-200"}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`grid h-10 w-10 place-items-center rounded-xl bg-slate-100 ${cat.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{cat.label}</CardTitle>
                          <CardDescription className="text-xs">
                            {enabled
                              ? `Next: ${existing?.next_occurrence_at ? new Date(existing.next_occurrence_at).toLocaleString() : "—"}`
                              : "Off"}
                          </CardDescription>
                        </div>
                      </div>
                      <Switch checked={enabled} onCheckedChange={(v) => toggleBuiltin(cat.id, v)} />
                    </div>
                  </CardHeader>
                  {enabled && (
                    <CardContent className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label className="text-xs">Time</Label>
                          <Input
                            type="time"
                            defaultValue={existing?.reminder_time?.slice?.(0, 5) || cat.defaultTime}
                            onBlur={(e) => saveBuiltin(cat.id, { time: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Repeat</Label>
                          <div className="flex flex-wrap gap-1 pt-1">
                            <button
                              type="button"
                              onClick={() => saveBuiltin(cat.id, { days: null })}
                              className="rounded-md bg-indigo-100 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-200"
                            >
                              Every day
                            </button>
                            <button
                              type="button"
                              onClick={() => saveBuiltin(cat.id, { days: [1, 2, 3, 4, 5] })}
                              className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                            >
                              Weekdays
                            </button>
                            <button
                              type="button"
                              onClick={() => saveBuiltin(cat.id, { days: [0, 6] })}
                              className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                            >
                              Weekends
                            </button>
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {DAYS.map((d) => {
                              const selected = existing?.days_of_week ? existing.days_of_week.includes(d.id) : true;
                              return (
                                <button
                                  key={d.id}
                                  type="button"
                                  onClick={() => {
                                    const cur = existing?.days_of_week || DAYS.map((x) => x.id);
                                    const next = cur.includes(d.id) ? cur.filter((x) => x !== d.id) : [...cur, d.id];
                                    saveBuiltin(cat.id, { days: next.length === 7 ? null : next });
                                  }}
                                  className={`rounded-md px-2 py-1 text-xs font-semibold ${selected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}
                                >
                                  {d.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label className="text-xs">Title</Label>
                          <Input
                            defaultValue={existing?.title || DEFAULT_TITLES[cat.id]}
                            onBlur={(e) => saveBuiltin(cat.id, { title: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Message</Label>
                          <Input
                            defaultValue={existing?.message || DEFAULT_MESSAGES[cat.id]}
                            onBlur={(e) => saveBuiltin(cat.id, { message: e.target.value })}
                          />
                        </div>
                      </div>
                      {isAndroidReminderBridgeAvailable() && (
                        <div className="max-w-xs">
                          <Label className="text-xs">Alarm sound</Label>
                          <Select
                            value={soundToOption(existing?.sound || DEFAULT_SOUND)}
                            onValueChange={(v) => saveBuiltin(cat.id, { sound: optionToSound(v) })}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {ALARM_SOUNDS.map((s) => (
                                <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="mt-1 text-xs text-slate-500">Rings on your device even when the app is closed.</p>
                        </div>
                      )}
                      <div className="flex justify-end">
                        <Button variant="outline" size="sm" onClick={() => handleTest(cat.id)} disabled={testing === cat.id}>
                          {testing === cat.id ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1 h-3.5 w-3.5" />}
                          Send test
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}

            {/* Salah */}
            <Card className="border-emerald-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Landmark className="h-5 w-5 text-emerald-600" /> Salah reminders
                </CardTitle>
                <CardDescription className="text-xs">Set your location to calculate prayer times. Each prayer can have its own reminder.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <Label className="text-xs">Latitude</Label>
                    <Input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="e.g. 21.4225" />
                  </div>
                  <div>
                    <Label className="text-xs">Longitude</Label>
                    <Input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="e.g. 39.8262" />
                  </div>
                  <div>
                    <Label className="text-xs">Method</Label>
                    <Select value={String(method)} onValueChange={(v) => setMethod(Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CALCULATION_METHODS.map((m) => (
                          <SelectItem key={m.id} value={String(m.id)}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={detectLocation} disabled={locating}>
                    <MapPin className="mr-1 h-3.5 w-3.5" /> {locating ? "Detecting…" : "Use my location"}
                  </Button>
                  <Button size="sm" onClick={saveSalahLocation} disabled={saving}>
                    {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />} Save prayer times
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleTest("salah")} disabled={testing === "salah"}>
                    <Send className="mr-1 h-3.5 w-3.5" /> Test
                  </Button>
                </div>

                <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                  {SALAH_PRAYERS.map((p) => {
                    const r = getSalah(p.id);
                    const enabled = r?.enabled ?? false;
                    return (
                      <div key={p.id} className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Switch checked={enabled} onCheckedChange={(v) => toggleSalah(p.id, v)} />
                          <span className="text-sm font-semibold text-slate-800">{p.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-slate-500">Minutes before</Label>
                          <Input
                            type="number"
                            min={0}
                            max={120}
                            className="w-20"
                            defaultValue={r?.minutes_before ?? 10}
                            onBlur={(e) => setMinutesBefore(p.id, Number(e.target.value))}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Custom reminders */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Custom reminders</CardTitle>
                  <Button size="sm" onClick={() => openCustom(null)}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> New
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {customReminders.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-500">No custom reminders yet.</p>
                ) : (
                  <div className="space-y-2">
                    {customReminders.map((r) => (
                      <div key={r.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{r.title}</p>
                          <p className="text-xs text-slate-500">
                            {r.reminder_time?.slice?.(0, 5)} · {r.days_of_week ? r.days_of_week.map((d) => DAYS.find((x) => x.id === d)?.label).join(",") : "Every day"}
                            {r.enabled ? "" : " · Off"}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openCustom(r)}><Settings2 className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => handleTest("custom")}><Send className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => removeCustom(r.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <Link to={createPageUrl("ReminderDiagnostics")} className="text-sm font-semibold text-indigo-600 hover:underline">
            View diagnostics →
          </Link>
          <Link to={createPageUrl("Home")} className="text-sm font-semibold text-slate-500 hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>

      {/* Custom reminder dialog */}
      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{customForm.editId ? "Edit custom reminder" : "New custom reminder"}</DialogTitle>
            <DialogDescription>Set a title, message, time and days.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Title</Label>
              <Input value={customForm.title} onChange={(e) => setCustomForm({ ...customForm, title: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Message</Label>
              <Input value={customForm.message} onChange={(e) => setCustomForm({ ...customForm, message: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Time</Label>
              <Input type="time" value={customForm.time} onChange={(e) => setCustomForm({ ...customForm, time: e.target.value })} />
            </div>
            {isAndroidReminderBridgeAvailable() && (
              <div>
                <Label className="text-xs">Alarm sound</Label>
                <Select
                  value={soundToOption(customForm.sound)}
                  onValueChange={(v) => setCustomForm({ ...customForm, sound: optionToSound(v) })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALARM_SOUNDS.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-xs">Repeat</Label>
              <div className="flex flex-wrap gap-1 pt-1">
                <button
                  type="button"
                  onClick={() => setCustomForm({ ...customForm, days: [] })}
                  className="rounded-md bg-indigo-100 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-200"
                >
                  Every day
                </button>
                <button
                  type="button"
                  onClick={() => setCustomForm({ ...customForm, days: [1, 2, 3, 4, 5] })}
                  className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                >
                  Weekdays
                </button>
                <button
                  type="button"
                  onClick={() => setCustomForm({ ...customForm, days: [0, 6] })}
                  className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                >
                  Weekends
                </button>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {DAYS.map((d) => {
                  const selected = customForm.days.includes(d.id) || customForm.days.length === 0;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        const cur = customForm.days.length ? customForm.days : DAYS.map((x) => x.id);
                        const next = cur.includes(d.id) ? cur.filter((x) => x !== d.id) : [...cur, d.id];
                        setCustomForm({ ...customForm, days: next.length === 7 ? [] : next });
                      }}
                      className={`rounded-md px-2 py-1 text-xs font-semibold ${selected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomOpen(false)}>Cancel</Button>
            <Button onClick={saveCustom} disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
