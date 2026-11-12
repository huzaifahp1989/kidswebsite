import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  FileDown,
  MapPin,
  RefreshCw,
  Search,
  Trash2,
  UserRoundCheck,
  Users,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { createPageUrl } from "@/utils";

const ADMIN_HEADERS = { "x-admin-auth": "true" };

const formatDate = (value) => {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString();
  } catch {
    return "—";
  }
};

const formatRelative = (value) => {
  if (!value) return "—";
  const diff = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diff)) return "—";
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const isWithinLastWeek = (value) => {
  const t = new Date(value).getTime();
  return Number.isFinite(t) && Date.now() - t < 7 * 24 * 60 * 60 * 1000;
};

export default function AdminWelcomeSubmissions() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [setupRequired, setSetupRequired] = useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/app-users", { headers: ADMIN_HEADERS });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Could not load app users");
      setSetupRequired(Boolean(json.setupRequired));
      setProfiles(Array.isArray(json.profiles) ? json.profiles : []);
    } catch (e) {
      setError(e?.message || "Could not load app users");
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const cities = new Set(profiles.map((p) => (p.city || "").trim()).filter(Boolean));
    const ages = profiles.map((p) => Number(p.age)).filter((n) => Number.isFinite(n));
    return {
      total: profiles.length,
      cities: cities.size,
      averageAge: ages.length
        ? Math.round((ages.reduce((sum, n) => sum + n, 0) / ages.length) * 10) / 10
        : "—",
      newThisWeek: profiles.filter((p) => isWithinLastWeek(p.created_at)).length,
    };
  }, [profiles]);

  const filtered = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) =>
      [p.full_name, p.city, p.heard_about, String(p.age ?? ""), p.id]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [profiles, query]);

  const handleDelete = async (id) => {
    try {
      await fetch(`/api/admin/app-users?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: ADMIN_HEADERS,
      });
    } catch {}
    load();
  };

  const handleClearAll = async () => {
    if (!profiles.length) return;
    const ok = window.confirm(
      "Delete ALL app user profiles? This cannot be undone — export the CSV first if you need a copy.",
    );
    if (!ok) return;
    try {
      await fetch("/api/admin/app-users?all=true", { method: "DELETE", headers: ADMIN_HEADERS });
    } catch {}
    load();
  };

  const handleExportCSV = () => {
    // The CSV is generated server-side so it always covers every profile.
    window.location.href = "/api/admin/app-users/export";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/40 py-10 px-4 sm:px-6">
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
                App users
              </h1>
              <p className="text-sm text-slate-600 mt-0.5">
                Details shared through the “get to know you” form (full name, age, city and how
                they heard about the app).
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
              disabled={!profiles.length}
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
              disabled={!profiles.length}
              className="gap-1.5 bg-gradient-to-r from-blue-700 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-500 shadow"
            >
              <FileDown className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </motion.div>

        {setupRequired && (
          <div className="mt-6 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Database table not created yet</p>
              <p className="mt-1">
                Apply <code className="rounded bg-amber-100 px-1">supabase/create-app-user-profiles.sql</code> in
                the Supabase SQL editor, then press Refresh.
              </p>
            </div>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4"
        >
          {[
            {
              icon: Users,
              label: "Total users",
              value: stats.total,
              color: "from-blue-500 to-indigo-500",
            },
            {
              icon: MapPin,
              label: "Unique cities",
              value: stats.cities,
              color: "from-sky-500 to-blue-600",
            },
            {
              icon: UserRoundCheck,
              label: "Average age",
              value: stats.averageAge,
              color: "from-violet-500 to-purple-600",
            },
            {
              icon: CalendarDays,
              label: "New this week",
              value: stats.newThisWeek,
              color: "from-emerald-500 to-teal-600",
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
                  <UserRoundCheck className="h-5 w-5 text-blue-700" />
                  {loading
                    ? "Loading…"
                    : filtered.length === profiles.length
                      ? `${profiles.length} user${profiles.length === 1 ? "" : "s"}`
                      : `${filtered.length} of ${profiles.length} shown`}
                </CardTitle>
                <CardDescription className="mt-1">
                  Search across name, city, age, how-heard or ID. The CSV export always includes
                  every user.
                </CardDescription>
              </div>
              <div className="w-full sm:w-72">
                <Label htmlFor="app-users-search" className="mb-1.5 block text-xs font-semibold text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    <Search className="h-3.5 w-3.5" />
                    Search
                  </span>
                </Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="app-users-search"
                    type="search"
                    placeholder="e.g. Abdullah, Birmingham…"
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
            </CardHeader>
            <CardContent className="p-0">
              {error && (
                <div className="m-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 ring-1 ring-blue-200">
                    <UserRoundCheck className="h-7 w-7" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-slate-900">
                    {profiles.length === 0 ? "No app users yet" : "No matches for current filters"}
                  </h3>
                  <p className="mt-2 max-w-md text-sm text-slate-600">
                    {profiles.length === 0
                      ? "New details will appear here after users complete the “get to know you” form."
                      : "Clear the search box to see everyone."}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                    {query && (
                      <Button type="button" size="sm" variant="outline" onClick={() => setQuery("")}>
                        Clear search
                      </Button>
                    )}
                    <Link to={createPageUrl("GetToKnowYou")}>
                      <Button type="button" size="sm" className="bg-blue-700 hover:bg-blue-600">
                        Open the form
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filtered.map((p, idx) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.015, 0.18) }}
                      className="p-4 sm:p-5"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900 break-words">
                              {p.full_name || "(no name)"}
                            </h3>
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200 tabular-nums">
                              {formatRelative(p.created_at)}
                            </span>
                            {p.source === "page" && (
                              <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700 ring-1 ring-indigo-200">
                                Form page
                              </span>
                            )}
                          </div>
                          <div className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
                            <div className="flex items-start gap-2 text-slate-700">
                              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-violet-700" />
                              <div>
                                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                  Age
                                </div>
                                <div>{p.age ?? <span className="text-slate-400 italic">Not provided</span>}</div>
                              </div>
                            </div>
                            <div className="flex items-start gap-2 text-slate-700">
                              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
                              <div>
                                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                  City
                                </div>
                                <div className="break-words">
                                  {p.city || <span className="text-slate-400 italic">Not provided</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-start gap-2 text-slate-700">
                              <Search className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                              <div>
                                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                  Heard about the app via
                                </div>
                                <div className="break-words">
                                  {p.heard_about || <span className="text-slate-400 italic">Not provided</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            <span title={formatDate(p.created_at)}>
                              Submitted:{" "}
                              <span className="font-semibold text-slate-700">
                                {formatDate(p.created_at)}
                              </span>
                            </span>
                            <span aria-hidden>•</span>
                            <span className="font-mono text-[10px] text-slate-400 truncate max-w-[40vw] sm:max-w-sm">
                              ID: {p.id}
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-2 sm:flex-col sm:items-end">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(p.id)}
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
