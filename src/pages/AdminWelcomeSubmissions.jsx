import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  FileDown,
  Trash2,
  Users,
  MessageSquare,
  Search,
  Megaphone,
  BadgeCheck,
  Filter,
  X,
  MapPin,
  Phone,
  HandHeart,
  RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";
import { createPageUrl } from "@/utils";
import {
  deleteWelcomeSubmission,
  exportWelcomeSubmissionsCSV,
  listWelcomeSubmissions,
  clearAllWelcomeSubmissions,
} from "@/utils/welcomeStore";

const formatSubmittedAt = (ts) => {
  if (!ts) return "—";
  try {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString();
  } catch {
    return "—";
  }
};

const formatRelative = (ts) => {
  if (!ts) return "—";
  try {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  } catch {
    return "—";
  }
};

export default function AdminWelcomeSubmissions() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [broadcastFilter, setBroadcastFilter] = useState("all"); // all | yes | no

  const load = () => {
    try {
      setItems(listWelcomeSubmissions());
    } catch {
      setItems([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const total = items.length;
    const optedIn = items.filter((s) => Boolean(s.broadcastOptIn)).length;
    const cities = new Set(items.map((s) => (s.city || "").trim()).filter(Boolean)).size;
    const withFeedback = items.filter((s) => (s.feedback || "").trim().length > 0).length;
    return { total, optedIn, cities, withFeedback };
  }, [items]);

  const filtered = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    return items.filter((s) => {
      if (broadcastFilter === "yes" && !Boolean(s.broadcastOptIn)) return false;
      if (broadcastFilter === "no" && Boolean(s.broadcastOptIn)) return false;
      if (!q) return true;
      const haystack = [
        s.name,
        s.city,
        s.mobile,
        s.heardAbout,
        s.feedback,
        s.id,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, query, broadcastFilter]);

  const handleDelete = (id) => {
    try {
      deleteWelcomeSubmission(id);
    } catch {}
    load();
  };

  const handleClearAll = () => {
    if (!items.length) return;
    const ok = window.confirm(
      "Delete ALL welcome submissions? This cannot be undone (the CSV export button saves a copy first if you need it).",
    );
    if (!ok) return;
    try {
      clearAllWelcomeSubmissions();
    } catch {}
    load();
  };

  const handleExportCSV = () => {
    try {
      exportWelcomeSubmissionsCSV();
    } catch (e) {
      console.error("Welcome CSV export failed", e);
      alert("CSV export failed — please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/40 py-10 px-4 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate(createPageUrl("AdminDashboard"))}
              className="gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Welcome submissions
              </h1>
              <p className="text-sm text-slate-600 mt-0.5">
                Everything new users share from the &ldquo;Welcome to Islam Media&rdquo; popup
                (name, city, mobile, broadcast opt-in, how they heard about you, feedback).
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={load}
              className="gap-1.5"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={!items.length}
              onClick={handleClearAll}
              className="gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              Delete all
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleExportCSV}
              disabled={!items.length}
              className="gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 shadow"
            >
              <FileDown className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4"
        >
          {[
            {
              icon: Users,
              label: "Total submissions",
              value: stats.total,
              color: "from-blue-500 to-indigo-500",
            },
            {
              icon: Megaphone,
              label: "Broadcast list opt-in",
              value: stats.optedIn,
              color: "from-emerald-500 to-teal-600",
            },
            {
              icon: MapPin,
              label: "Unique cities",
              value: stats.cities,
              color: "from-sky-500 to-blue-600",
            },
            {
              icon: MessageSquare,
              label: "With feedback / dua",
              value: stats.withFeedback,
              color: "from-amber-500 to-orange-500",
            },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label} className="border-slate-200 shadow-sm">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${s.color} text-white shadow-sm`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[0.7rem] font-semibold uppercase tracking-wider text-slate-500">
                        {s.label}
                      </div>
                      <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
                        {s.value}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mt-6 border-slate-200 shadow-sm">
            <CardHeader className="gap-3 border-b border-slate-100 p-4 sm:p-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                  <HandHeart className="h-5 w-5 text-emerald-600" />
                  {filtered.length === items.length
                    ? `${items.length} submission${items.length === 1 ? "" : "s"}`
                    : `${filtered.length} of ${items.length} shown`}
                </CardTitle>
                <CardDescription className="mt-1">
                  Search across name, city, mobile, how-heard, feedback, or ID. CSV export always
                  exports the full list.
                </CardDescription>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="w-full sm:w-72">
                  <Label htmlFor="welcome-search" className="mb-1.5 block text-xs font-semibold text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <Search className="h-3.5 w-3.5" />
                      Search
                    </span>
                  </Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="welcome-search"
                      type="search"
                      placeholder="e.g. Abdullah, London, WhatsApp…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="min-h-[40px] pl-8 pr-8"
                    />
                    {query && (
                      <button
                        type="button"
                        aria-label="Clear search"
                        onClick={() => setQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="w-full sm:w-52">
                  <Label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <Filter className="h-3.5 w-3.5" />
                      Broadcast list
                    </span>
                  </Label>
                  <div className="grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                    {[
                      { key: "all", label: "All" },
                      { key: "yes", label: "Opted-in" },
                      { key: "no", label: "No" },
                    ].map((f) => (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setBroadcastFilter(f.key)}
                        className={
                          "min-h-[36px] rounded-lg px-2 text-xs font-semibold transition " +
                          (broadcastFilter === f.key
                            ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow"
                            : "text-slate-600 hover:bg-slate-100")
                        }
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
                    <HandHeart className="h-7 w-7" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-slate-900">
                    {items.length === 0
                      ? "No welcome submissions yet"
                      : "No matches for current filters"}
                  </h3>
                  <p className="mt-2 max-w-md text-sm text-slate-600">
                    {items.length === 0
                      ? "New users will appear here after they dismiss the webinar popup and fill the welcome form on the home page."
                      : "Clear the search box or switch broadcast filter to All."}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                    {query && (
                      <Button type="button" size="sm" variant="outline" onClick={() => setQuery("")}>
                        Clear search
                      </Button>
                    )}
                    {broadcastFilter !== "all" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setBroadcastFilter("all")}
                      >
                        Show all
                      </Button>
                    )}
                    <Link to={createPageUrl("Home")}>
                      <Button type="button" size="sm" className="bg-emerald-600 hover:bg-emerald-500">
                        Open Home page
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filtered.map((s, idx) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.015, 0.18) }}
                      className="p-4 sm:p-5"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900 break-words">
                              {s.name || "(no name)"}
                            </h3>
                            {Boolean(s.broadcastOptIn) ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800 ring-1 ring-emerald-200">
                                <Megaphone className="h-3 w-3" />
                                Broadcast list
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 ring-1 ring-slate-200">
                                Opted out
                              </span>
                            )}
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200 tabular-nums">
                              {formatRelative(s.submittedAt)}
                            </span>
                          </div>
                          <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                            <div className="flex items-start gap-2 text-slate-700">
                              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
                              <div>
                                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                  City / Country
                                </div>
                                <div className="break-words">
                                  {s.city || <span className="text-slate-400 italic">Not provided</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-start gap-2 text-slate-700">
                              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                              <div>
                                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                  Mobile / WhatsApp
                                </div>
                                <div className="break-all">
                                  {s.mobile || <span className="text-slate-400 italic">Not provided</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-start gap-2 text-slate-700 sm:col-span-2">
                              <Search className="mt-0.5 h-4 w-4 shrink-0 text-indigo-700" />
                              <div>
                                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                  How did you hear about us?
                                </div>
                                <div className="break-words">
                                  {s.heardAbout || <span className="text-slate-400 italic">Not provided</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                          {(s.feedback || "").trim() ? (
                            <div className="mt-3 rounded-2xl border border-amber-200/70 bg-amber-50/70 p-3 sm:p-3.5">
                              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800">
                                <MessageSquare className="h-3.5 w-3.5" />
                                Feedback / Dua request
                              </div>
                              <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800">
                                {s.feedback}
                              </p>
                            </div>
                          ) : null}
                          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            <span title={formatSubmittedAt(s.submittedAt)}>
                              Submitted: <span className="font-semibold text-slate-700">{formatSubmittedAt(s.submittedAt)}</span>
                            </span>
                            <span aria-hidden>•</span>
                            <span className="font-mono text-[10px] text-slate-400 truncate max-w-[40vw] sm:max-w-sm">
                              ID: {s.id}
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-2 sm:flex-col sm:items-end">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(s.id)}
                            className="gap-1.5"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sm:hidden">Delete</span>
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
