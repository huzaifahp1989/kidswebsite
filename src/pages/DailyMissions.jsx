import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, BellRing, CheckCircle, Clock3, Target, CalendarClock, Trash2 } from "lucide-react";
import { awardPointsForGame } from "@/api/points";
import { watchAuth } from "@/api/firebase";
import { DAILY_MISSIONS } from "@/constants/dailyMissions";
import {
  listActivityReminders,
  markActivityReminderCompleted,
  removeActivityReminder,
  saveActivityReminder,
} from "@/api/activityReminders";
import {
  areAndroidNotificationsEnabled,
  isAndroidWebView,
  optInToAndroidPush,
  requestAndroidNotifications,
} from "@/utils/androidWebView";
import {
  getPushNotificationStatus,
  initOneSignal,
  promptPushNotification,
} from "@/utils/oneSignal";

export default function DailyMissions() {
  const [user, setUser] = useState(null);
  const [state, setState] = useState({});
  const [reminders, setReminders] = useState({});
  const [reminderTimes, setReminderTimes] = useState({});
  const [remindersLoading, setRemindersLoading] = useState(false);
  const [reminderAction, setReminderAction] = useState("");
  const [reminderMessage, setReminderMessage] = useState("");

  useEffect(() => {
    const stop = watchAuth((u) => setUser(u));
    return () => stop?.();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setReminders({});
    setReminderTimes({});
    setRemindersLoading(Boolean(user));
    setReminderMessage("");
    if (!user) {
      setRemindersLoading(false);
      return undefined;
    }
    listActivityReminders()
      .then((items) => {
        if (cancelled) return;
        const byId = Object.fromEntries(items.map((item) => [item.activityId, item]));
        setReminders(byId);
        setReminderTimes((previous) => {
          const next = { ...previous };
          for (const item of items) next[item.activityId] = item.reminderTime;
          return next;
        });
      })
      .catch((error) => {
        if (!cancelled) setReminderMessage(error.message);
      })
      .finally(() => {
        if (!cancelled) setRemindersLoading(false);
      });
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("daily_missions_state");
      const obj = raw ? JSON.parse(raw) : {};
      const last = obj.last_reset || 0;
      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;
      if (!last || now - last > day) {
        const next = { last_reset: now, completed: {} };
        localStorage.setItem("daily_missions_state", JSON.stringify(next));
        setState(next);
      } else {
        setState(obj);
      }
    } catch {
      console.warn("Could not load saved daily mission progress.");
      setState({ last_reset: Date.now(), completed: {} });
    }
  }, []);

  const completeMission = async (id, pts) => {
    const already = state?.completed?.[id];
    if (already) return;
    let completionNotice = "";
    try {
      await awardPointsForGame(user, `mission_${id}`, { fallbackScore: pts });
    } catch (error) {
      completionNotice = `Mission completed, but points could not be awarded: ${error.message}`;
    }
    const next = {
      ...(state || {}),
      completed: { ...(state?.completed || {}), [id]: true },
    };
    setState(next);
    try {
      localStorage.setItem("daily_missions_state", JSON.stringify(next));
    } catch (error) {
      console.warn("Could not save daily mission progress locally:", error);
    }
    if (user) {
      try {
        const result = await markActivityReminderCompleted(id);
        if (result.reminderConfigured) {
          completionNotice = [completionNotice, "Its reminder will pause until the next daily mission reset."]
            .filter(Boolean)
            .join(" ");
        }
      } catch (error) {
        completionNotice = [completionNotice, `Its reminder could not be updated: ${error.message}`]
          .filter(Boolean)
          .join(" ");
      }
    }
    if (completionNotice) setReminderMessage(completionNotice);
  };

  const ensurePushEnabled = async () => {
    if (isAndroidWebView()) {
      if (areAndroidNotificationsEnabled() !== true) {
        requestAndroidNotifications();
        optInToAndroidPush();
        throw new Error("Allow notifications in Android, then set the reminder again.");
      }
      optInToAndroidPush();
      return;
    }

    await initOneSignal();
    let status = await getPushNotificationStatus();
    if (!status.capable || !status.supported) {
      throw new Error("Push reminders are not supported in this browser. Try the Android app or a supported browser.");
    }
    if (!status.ready) {
      throw new Error("Push notifications are still loading. Please try again shortly.");
    }
    if (!status.subscribed) {
      await promptPushNotification({ force: true, skipCooldown: true });
      status = await getPushNotificationStatus();
    }
    if (!status.subscribed) {
      throw new Error("Enable push notifications in your browser to receive reminders while the app is closed.");
    }
  };

  const handleSaveReminder = async (mission) => {
    if (!user) {
      setReminderMessage("Sign in to save reminders to your account.");
      return;
    }
    const actionKey = `save:${mission.id}`;
    setReminderAction(actionKey);
    setReminderMessage("");
    try {
      await ensurePushEnabled();
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const reminderTime = reminderTimes[mission.id] || "18:00";
      await saveActivityReminder(mission.id, reminderTime, timeZone);
      setReminders((previous) => ({
        ...previous,
        [mission.id]: { activityId: mission.id, reminderTime, timeZone },
      }));
      setReminderMessage(`Daily reminder set for ${mission.title}.`);
    } catch (error) {
      setReminderMessage(error.message);
    } finally {
      setReminderAction("");
    }
  };

  const handleRemoveReminder = async (mission) => {
    setReminderAction(`remove:${mission.id}`);
    setReminderMessage("");
    try {
      await removeActivityReminder(mission.id);
      setReminders((previous) => {
        const next = { ...previous };
        delete next[mission.id];
        return next;
      });
      setReminderMessage(`Reminder removed for ${mission.title}.`);
    } catch (error) {
      setReminderMessage(error.message);
    } finally {
      setReminderAction("");
    }
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Card className="mb-6 border-2 border-blue-300">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-amber-500 text-white">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Target className="w-5 h-5" /> Daily Missions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 flex items-center gap-2">
              <CalendarClock className="w-4 h-4" /> Resets every 24 hours
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Set a daily push reminder for each mission. It pauses for that day when you mark the mission complete.
            </p>
          </CardContent>
        </Card>

        {reminderMessage ? (
          <div role="status" className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            {reminderMessage}
          </div>
        ) : null}

        <div className="space-y-4">
          {DAILY_MISSIONS.map((m) => (
            <Card key={m.id} className="border-2">
              <CardContent className="p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-lg font-semibold">{m.title}</div>
                    <div className="text-sm text-gray-600">+{m.points} points</div>
                  </div>
                  {state?.completed?.[m.id] ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-5 h-5" /> Completed
                    </div>
                  ) : (
                    <Button onClick={() => completeMission(m.id, m.points)} className="bg-blue-600 hover:bg-blue-700">Mark Done</Button>
                  )}
                </div>
                <div className="mt-4 rounded-lg border bg-slate-50 p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <label className="flex-1 text-sm font-medium text-gray-700">
                      <span className="mb-1 flex items-center gap-2">
                        {reminders[m.id] ? <BellRing className="h-4 w-4 text-blue-600" /> : <Bell className="h-4 w-4 text-gray-500" />}
                        Daily reminder time
                      </span>
                      <input
                        type="time"
                        value={reminderTimes[m.id] || reminders[m.id]?.reminderTime || "18:00"}
                        onChange={(event) => setReminderTimes((previous) => ({
                          ...previous,
                          [m.id]: event.target.value,
                        }))}
                        disabled={!user || remindersLoading || Boolean(reminderAction)}
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900"
                      />
                    </label>
                    <Button
                      onClick={() => handleSaveReminder(m)}
                      disabled={!user || remindersLoading || Boolean(reminderAction)}
                      className="bg-violet-700 hover:bg-violet-800"
                    >
                      <Clock3 className="mr-2 h-4 w-4" />
                      {reminderAction === `save:${m.id}` ? "Saving..." : reminders[m.id] ? "Update reminder" : "Set daily reminder"}
                    </Button>
                    {reminders[m.id] ? (
                      <Button
                        variant="outline"
                        onClick={() => handleRemoveReminder(m)}
                        disabled={Boolean(reminderAction)}
                        aria-label={`Remove ${m.title} reminder`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    {reminders[m.id]
                      ? `Repeats daily in ${reminders[m.id].timeZone}.`
                      : user
                        ? "Requires push notifications to be enabled."
                        : "Sign in to save a reminder across devices."}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
