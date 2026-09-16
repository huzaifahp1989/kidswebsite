import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Bell,
  BellRing,
  FileDown,
  Trash2,
  Megaphone,
  Search,
  Filter,
  X,
  PlusCircle,
  Edit3,
  RefreshCw,
  Save,
  AlertTriangle,
  Eye,
  EyeOff,
  ExternalLink,
  Flame,
  Sparkles,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";
import { createPageUrl } from "@/utils";
import {
  NOTICES_STORAGE_KEY,
  NOTICE_PRIORITY,
  PRIORITY_META,
  addNotice,
  updateNotice,
  deleteNotice,
  clearAllNotices,
  countNotices,
  exportNoticesCSV,
  getNotice,
  listNotices,
  setLastReadNow,
} from "@/utils/noticeStore";

const formatDateTime = (ts) => {
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

const PRIORITY_OPTIONS = [
  { value: NOTICE_PRIORITY.normal, label: "Normal", icon: Bell, desc: "Standard notice, subtle dot" },
  { value: NOTICE_PRIORITY.highlight, label: "Highlight", icon: Sparkles, desc: "Amber highlight + pulse badge on bell" },
  { value: NOTICE_PRIORITY.urgent, label: "Urgent", icon: Flame, desc: "Red highlight + ping badge on bell" },
];

const emptyForm = () => ({
  id: null,
  title: "",
  body: "",
  priority: NOTICE_PRIORITY.normal,
  active: true,
  linkUrl: "",
  linkLabel: "",
});

export default function AdminNotices() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all"); // all | normal | highlight | urgent
  const [activeFilter, setActiveFilter] = useState("all"); // all | active | inactive
  const [formVisible, setFormVisible] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState("");

  const load = () => {
    try {
      setItems(listNotices({ includeInactive: true }));
    } catch {
      setItems([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const total = items.length;
    const active = items.filter((n) => n.active).length;
    const highlight = items.filter((n) => n.active && n.priority !== NOTICE_PRIORITY.normal).length;
    const urgent = items.filter((n) => n.active && n.priority === NOTICE_PRIORITY.urgent).length;
    return { total, active, highlight, urgent };
  }, [items]);

  const filtered = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    return items.filter((n) => {
      if (activeFilter === "active" && !n.active) return false;
      if (activeFilter === "inactive" && n.active) return false;
      if (priorityFilter !== "all" && n.priority !== priorityFilter) return false;
      if (!q) return true;
      const haystack = [n.title, n.body, n.id, n.linkLabel, n.linkUrl, n.priority].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [items, query, priorityFilter, activeFilter]);

  const openNewForm = () => {
    setForm(emptyForm());
    setFormError("");
    setFormVisible(true);
  };

  const openEditForm = (id) => {
    const row = getNotice(id);
    if (!row) return;
    setForm({
      id: row.id,
      title: row.title,
      body: row.body,
      priority: row.priority,
      active: row.active,
      linkUrl: row.linkUrl,
      linkLabel: row.linkLabel,
    });
    setFormError("");
    setFormVisible(true);
  };

  const closeForm = () => {
    setForm(emptyForm());
    setFormError("");
    setFormVisible(false);
  };

  const handleSave = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const title = (form.title || "").trim();
    const body = (form.body || "").trim();
    if (!title) {
      setFormError("Please add a title.");
      return;
    }
    if (title.length > 160) {
      setFormError("Title is too long (max 160 characters).");
      return;
    }
    if (body.length > 2000) {
      setFormError("Body is too long (max 2000 characters).");
      return;
    }
    const payload = {
      title,
      body,
      priority: Object.values(NOTICE_PRIORITY).includes(form.priority) ? form.priority : NOTICE_PRIORITY.normal,
      active: Boolean(form.active),
      linkUrl: (form.linkUrl || "").trim(),
      linkLabel: (form.linkLabel || "").trim(),
    };
    try {
      if (form.id) {
        updateNotice(form.id, payload);
      } else {
        addNotice(payload);
      }
    } catch {}
    load();
    closeForm();
  };

  const handleDelete = (id) => {
    if (!id) return;
    const n = getNotice(id);
    const ok = window.confirm(
      `Delete notice "${n?.title || id}"? This will be removed from all user bell notifications.`,
    );
    if (!ok) return;
    try {
      deleteNotice(id);
    } catch {}
    load();
  };

  const handleToggleActive = (id) => {
    const n = getNotice(id);
    if (!n) return;
    try {
      updateNotice(id, { active: !n.active });
    } catch {}
    load();
  };

  const handleClearAll = () => {
    if (!items.length) return;
    const ok = window.confirm(
      "Delete ALL notices? Users will see an empty bell immediately. Export CSV first if you need a backup.",
    );
    if (!ok) return;
    try {
      clearAllNotices();
    } catch {}
    load();
  };

  const handleExport = () => {
    try {
      exportNoticesCSV();
    } catch {}
  };

  const handleMarkAllReadForMe = () => {
    try {
      setLastReadNow();
      window.alert("Marked all notices as read for this browser profile.");
    } catch {}
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 py-5 md:py-8 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="gap-2">
              <Link to={createPageUrl("AdminDashboard")}>
                <ArrowLeft className="w-4 h-4" />
                Dashboard
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
                <BellRing className="w-7 h-7 text-indigo-600" />
                Notices & Announcements
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Create site-wide notices. They appear on <strong>every page</strong> via the bell icon in the header, with highlight badges for Highlight / Urgent.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={load} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleMarkAllReadForMe} className="gap-2">
              <Eye className="w-4 h-4" />
              Mark all read (me)
            </Button>
            <Button variant="outline" onClick={handleExport} className="gap-2">
              <FileDown className="w-4 h-4" />
              Export CSV
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearAll}
              disabled={!items.length}
              className="gap-2 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Delete all
            </Button>
            <Button
              onClick={openNewForm}
              className="gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow"
            >
              <PlusCircle className="w-4 h-4" />
              Add notice
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.02 }}>
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2 text-xs uppercase tracking-wide">
                  <Bell className="w-4 h-4 text-slate-500" />
                  Total
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{stats.total}</div>
                <div className="text-xs text-slate-500 mt-1">saved notices in {NOTICES_STORAGE_KEY}</div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
            <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2 text-xs uppercase tracking-wide text-emerald-700">
                  <Eye className="w-4 h-4" />
                  Live
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-900">{stats.active}</div>
                <div className="text-xs text-emerald-700 mt-1">shown in bell right now</div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2 text-xs uppercase tracking-wide text-amber-700">
                  <Sparkles className="w-4 h-4" />
                  Highlight + Urgent
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-900">{stats.highlight}</div>
                <div className="text-xs text-amber-700 mt-1">bell shows a highlight badge</div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
            <Card className="border-rose-200 bg-rose-50/50 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2 text-xs uppercase tracking-wide text-rose-700">
                  <Flame className="w-4 h-4" />
                  Urgent live
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-rose-900">{stats.urgent}</div>
                <div className="text-xs text-rose-700 mt-1">pinging red dot on bell</div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <Card className="border-slate-200 shadow-sm mb-5">
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              <div className="relative md:max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search title, body, ID, link…"
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50 shadow-sm">
                  {[
                    { v: "all", label: "All" },
                    { v: "active", label: "Live" },
                    { v: "inactive", label: "Draft" },
                  ].map((o) => (
                    <Button
                      key={`act-${o.v}`}
                      size="sm"
                      variant={activeFilter === o.v ? "default" : "ghost"}
                      onClick={() => setActiveFilter(o.v)}
                      className={activeFilter === o.v ? "" : "hover:bg-white"}
                    >
                      {o.label}
                    </Button>
                  ))}
                </div>
                <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50 shadow-sm items-center gap-1">
                  <Filter className="w-4 h-4 text-slate-500 mx-2" />
                  {[
                    { v: "all", label: "All prio." },
                    { v: NOTICE_PRIORITY.normal, label: "Normal", icon: Bell, cls: "text-slate-700" },
                    { v: NOTICE_PRIORITY.highlight, label: "High.", icon: Sparkles, cls: "text-amber-700" },
                    { v: NOTICE_PRIORITY.urgent, label: "Urgent", icon: Flame, cls: "text-rose-700" },
                  ].map((o) => {
                    const Icon = o.icon;
                    return (
                      <Button
                        key={`prio-${o.v}`}
                        size="sm"
                        variant={priorityFilter === o.v ? "default" : "ghost"}
                        onClick={() => setPriorityFilter(o.v)}
                        className={`${priorityFilter === o.v ? "" : "hover:bg-white"} ${o.cls || ""}`}
                      >
                        {Icon ? <Icon className="w-4 h-4 mr-1" /> : null}
                        {o.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {formVisible && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed inset-0 z-[1100] flex items-end md:items-center justify-center p-0 md:p-4"
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeForm} />
            <Card className="relative z-10 w-full md:max-w-2xl md:rounded-2xl rounded-t-2xl rounded-b-none max-h-[92dvh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 bg-white">
              <CardHeader className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-none">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      {form.id ? <Edit3 className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
                      {form.id ? "Edit notice" : "Add notice"}
                    </CardTitle>
                    <CardDescription className="text-indigo-100 mt-1">
                      After saving it appears on the bell of <strong>every page</strong> (Home, Kids Zone, Quran, etc.).
                    </CardDescription>
                  </div>
                  <Button size="icon" variant="ghost" onClick={closeForm} className="text-white hover:bg-white/15">
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              <form onSubmit={handleSave} className="p-4 md:p-6 overflow-y-auto space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="n-title">Title *</Label>
                    <div className="text-xs text-slate-500 mt-0.5 mb-1">Short, 1 line. Shows bold in the bell drawer.</div>
                    <Input
                      id="n-title"
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="e.g. Jumuah reminder at 1pm this Friday"
                      className="min-h-[44px]"
                      maxLength={160}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="n-body">Details</Label>
                    <div className="text-xs text-slate-500 mt-0.5 mb-1">2–4 lines usually looks best. Max 2000 chars.</div>
                    <textarea
                      id="n-body"
                      value={form.body}
                      onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                      rows={5}
                      maxLength={2000}
                      placeholder="Optional longer description. Line breaks are respected."
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="mb-2 block">Priority & highlight</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3">
                      {PRIORITY_OPTIONS.map((o) => {
                        const Icon = o.icon;
                        const meta = PRIORITY_META[o.value];
                        const selected = form.priority === o.value;
                        return (
                          <button
                            key={o.value}
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, priority: o.value }))}
                            className={`text-left rounded-xl border p-3 transition-all ${
                              selected
                                ? "border-indigo-500 ring-2 ring-indigo-200 bg-indigo-50"
                                : "border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${meta.dotClass}`} />
                              <Icon className="w-4 h-4 text-slate-700" />
                              <div className="font-semibold text-slate-900">{o.label}</div>
                            </div>
                            <div className="text-xs text-slate-500 mt-2">{o.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="n-linkLabel">Button label (optional)</Label>
                    <Input
                      id="n-linkLabel"
                      value={form.linkLabel}
                      onChange={(e) => setForm((f) => ({ ...f, linkLabel: e.target.value }))}
                      placeholder="e.g. Sign up here"
                      className="min-h-[44px] mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="n-linkUrl">Button URL (optional)</Label>
                    <Input
                      id="n-linkUrl"
                      value={form.linkUrl}
                      onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))}
                      placeholder="https://…"
                      className="min-h-[44px] mt-1"
                    />
                  </div>
                  <div className="md:col-span-2 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        {form.active ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4 text-slate-500" />}
                        {form.active ? "Live" : "Draft (hidden)"}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Draft notices are saved here but not shown to users in the bell drawer.
                      </div>
                    </div>
                    <Switch checked={form.active} onCheckedChange={(c) => setForm((f) => ({ ...f, active: c }))} />
                  </div>
                </div>

                {formError ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {formError}
                  </div>
                ) : null}

                <div className="flex flex-col-reverse md:flex-row gap-2 md:justify-end md:pt-2">
                  <Button variant="outline" type="button" onClick={closeForm} className="h-12">
                    Cancel
                  </Button>
                  <Button type="submit" className="h-12 gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow">
                    <Save className="w-4 h-4" />
                    {form.id ? "Save changes" : "Publish notice"}
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}

        {!filtered.length ? (
          <Card className="border-dashed border-slate-300 bg-white/70">
            <CardContent className="p-10 md:p-14 text-center">
              <Bell className="w-12 h-12 mx-auto text-slate-400 mb-4" />
              <div className="text-xl font-semibold text-slate-800">No notices yet</div>
              <div className="text-sm text-slate-500 mt-1 max-w-lg mx-auto">
                Use <span className="font-medium">Add notice</span> to broadcast site-wide announcements, reminders, or urgent alerts. They appear on <strong>every page</strong> via the header bell.
              </div>
              <div className="mt-5 flex justify-center gap-2">
                <Button onClick={openNewForm} className="gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow">
                  <PlusCircle className="w-4 h-4" />
                  Create first notice
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {filtered.map((n, i) => {
              const meta = PRIORITY_META[n.priority];
              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(0.4, i * 0.02) }}
                >
                  <Card className={`border bg-gradient-to-br ${meta.accentClass} overflow-hidden shadow-sm`}>
                    <div className={`flex items-center justify-between px-4 py-2 ${meta.accentRibbon}`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${meta.dotClass}`} />
                        <Badge className={meta.chipClass}>{meta.label}</Badge>
                        <span className="text-[11px] opacity-90 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatRelative(n.createdAt)}
                        </span>
                      </div>
                      <div>
                        {n.active ? (
                          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-0">Live</Badge>
                        ) : (
                          <Badge className="bg-slate-500 hover:bg-slate-600 text-white border-0">Draft</Badge>
                        )}
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 break-words leading-snug">{n.title}</div>
                          <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                            <span>{formatDateTime(n.createdAt)}</span>
                            {n.updatedAt && Math.abs(n.updatedAt - (n.createdAt || 0)) > 5000 ? (
                              <span>· edited {formatRelative(n.updatedAt)}</span>
                            ) : null}
                            <span className="text-slate-400">· id {n.id}</span>
                          </div>
                          {n.body ? (
                            <div className="text-sm text-slate-700 whitespace-pre-wrap mt-2 leading-relaxed">
                              {n.body}
                            </div>
                          ) : null}
                          {n.linkUrl ? (
                            <div className="mt-3">
                              <a
                                href={n.linkUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-3 py-2 shadow"
                              >
                                <ExternalLink className="w-4 h-4" />
                                {n.linkLabel || "Open link"}
                              </a>
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200/70 pt-3">
                        <Button size="sm" variant="outline" onClick={() => handleToggleActive(n.id)} className="gap-1.5 h-9">
                          {n.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          {n.active ? "Pause" : "Make live"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEditForm(n.id)} className="gap-1.5 h-9">
                          <Edit3 className="w-4 h-4" />
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(n.id)} className="gap-1.5 h-9 ml-auto">
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        <Card className="mt-8 border-indigo-100 bg-indigo-50/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-indigo-900">
              <Megaphone className="w-5 h-5" />
              Admin guide: how notices work
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-indigo-900/90">
            <ul className="list-disc list-inside space-y-1.5">
              <li>
                <strong>Where it appears:</strong> the header <code className="px-1 rounded bg-white border">Bell</code> icon in [Layout.jsx] renders on <strong>every public & admin page</strong> (Home, Kids Zone, Quran, Hadith, AdminDashboard, etc.).
              </li>
              <li>
                <strong>Highlight badges:</strong>
                <ul className="list-[circle] list-inside ml-5 space-y-1 mt-1">
                  <li>Normal — small dot, unread badge count if unread.</li>
                  <li>Highlight — amber pulse + ring on bell so people notice.</li>
                  <li>Urgent — red ping badge (double halo), stands out over radio FAB and nav.</li>
                </ul>
              </li>
              <li>
                <strong>Unread tracking:</strong> per browser profile, saved in <code className="px-1 rounded bg-white border">notices_last_read_at_v1</code>. Clicking the bell → <em>Mark all read</em> clears the highlight. Users on different phones / browsers keep their own "seen" state.
              </li>
              <li>
                <strong>Data store:</strong> <code className="px-1 rounded bg-white border">{NOTICES_STORAGE_KEY}</code> (localStorage). Admin edits update the list instantly and dispatch a <code className="px-1 rounded bg-white border">notices:changed</code> event that the bell listens to — no page reload required on the same browser.
              </li>
              <li>
                <strong>Actions:</strong> Add / Edit / Pause (draft) / Delete / Delete-all, CSV export, Search, Live + Priority filters, 4 stat cards.
              </li>
              <li>
                <strong>Android WebView:</strong> since the bell lives inside React Layout, it automatically works in MainActivity.java wrapper — no Java changes needed. Link buttons inside notices use normal anchor tags; external URL handlers (if you wire them) already cover openExternalUrl from existing code paths.
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
