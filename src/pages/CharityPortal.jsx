import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  HandHeart,
  Heart,
  Building2,
  Users,
  CalendarCheck,
  Gift,
  ReceiptText,
  ClipboardList,
  ShieldCheck,
  Megaphone,
  LayoutDashboard,
  ExternalLink,
  ArrowLeft,
  Sparkles,
  Star,
  MapPin,
  Phone,
  Globe2,
  Send,
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { isAndroidWebView, openExternalUrl } from "@/utils/androidWebView";
import { DONATE_SUPPORT_URL } from "@/constants/externalLinks";

const CHARITY_PORTAL_NEXT_URL =
  import.meta.env.VITE_CHARITY_PORTAL_URL || "http://localhost:3000/";

const DONATE_URL = DONATE_SUPPORT_URL;

const MASJIDS = [
  {
    id: "2e735ba1-27e1-43d7-9608-c5626930ebf6",
    name: "Quwwatul Islam Masjid",
    address: "Peel Hall St",
    postcode: "PR1 6QQ",
    city: "Preston",
    county: "Lancashire",
    phone: "",
    website: "",
    notes: "Peel Hall St, Preston PR1 6QQ",
  },
  {
    id: "a1c8e4d2-4b7f-4c91-9e2a-7f3b6d8c1a20",
    name: "Madina Masjid",
    address: "82 Purlwell Lane, Mount Pleasant",
    postcode: "WF17 7NQ",
    city: "Batley",
    county: "West Yorkshire",
    phone: "01924 472378",
    website: "https://mpit.org.uk",
    notes: "82 Purlwell Lane, Mount Pleasant, Batley, West Yorkshire WF17 7NQ",
  },
  {
    id: "b2d9f5e3-5c80-4d02-af3b-8e4c7e9d2b31",
    name: "Noorul Islam Masjid",
    address: "Snowdon Street",
    postcode: "WF17 7RS",
    city: "Batley",
    county: "West Yorkshire",
    phone: "01924 472919",
    website: "",
    notes: "Snowdon Street, Batley, West Yorkshire WF17 7RS",
  },
];

const PORTAL_FEATURES = [
  {
    icon: Heart,
    title: "Donors & Gift Aid",
    body: "Track every donor, log donations, and prepare HMRC Gift Aid claims with per-gift scheduling.",
    tone: "from-rose-500 to-pink-600",
  },
  {
    icon: Building2,
    title: "Masjids & Bookings",
    body: "Register masjids with full contact details and manage hall bookings + recurring events.",
    tone: "from-emerald-500 to-teal-600",
  },
  {
    icon: Megaphone,
    title: "Fundraising Campaigns",
    body: "Launch public campaigns with public shareable pages, fundraisers, donation tiers, and live totals.",
    tone: "from-amber-500 to-orange-600",
  },
  {
    icon: Users,
    title: "Volunteers & Tasks",
    body: "Rota volunteers, assign tasks, track hours, and run reminders for community events.",
    tone: "from-sky-500 to-blue-600",
  },
  {
    icon: CalendarCheck,
    title: "Meetings & Minutes",
    body: "Schedule trustee / committee meetings, agenda templates, decisions, and action tracking.",
    tone: "from-violet-500 to-purple-600",
  },
  {
    icon: ReceiptText,
    title: "Finance & Expenses",
    body: "Log income and expenses with categories, attach receipts, and export monthly reports.",
    tone: "from-emerald-600 to-green-700",
  },
  {
    icon: ClipboardList,
    title: "Projects & Plans",
    body: "Organise charitable projects into milestone plans, assign owners, and track progress.",
    tone: "from-indigo-500 to-blue-700",
  },
  {
    icon: ShieldCheck,
    title: "Audit & Governance",
    body: "Immutable audit log of every change, documents vault, permissions, and trustees review.",
    tone: "from-slate-700 to-slate-900",
  },
  {
    icon: Gift,
    title: "Contacts & Gifts",
    body: "Keep business contacts, in-kind donations, donor gift history, and outreach pipelines.",
    tone: "from-fuchsia-500 to-rose-600",
  },
];

const QUICK_STATS = [
  { label: "Partner masjids", value: MASJIDS.length.toString(), icon: Building2, tone: "text-emerald-600" },
  { label: "Live campaigns", value: "0", icon: Megaphone, tone: "text-amber-600" },
  { label: "Charity features", value: PORTAL_FEATURES.length.toString(), icon: Sparkles, tone: "text-sky-600" },
  { label: "Zakat eligible", value: "100%", icon: Star, tone: "text-rose-600" },
];

function openUrl(url) {
  if (!url) return;
  if (isAndroidWebView()) {
    openExternalUrl(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function CharityPortal() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/40">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute -top-32 -left-24 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute top-10 right-0 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pt-6 pb-10 sm:px-6 sm:pt-10 lg:pt-12">
          <div className="flex items-center justify-between gap-3">
            <Link
              to={createPageUrl("Home")}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur hover:bg-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
            <div className="hidden sm:flex items-center gap-2">
              <Link
                to={createPageUrl("AdminDashboard")}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-white"
              >
                <LayoutDashboard className="h-4 w-4" />
                Admin
              </Link>
            </div>
          </div>

          <div className="mt-8 grid items-end gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-700 ring-1 ring-emerald-500/20">
                <HandHeart className="h-3.5 w-3.5" />
                Charity Portal · Central operations
              </div>
              <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
                Islam Media{" "}
                <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 bg-clip-text text-transparent">
                  Charity Portal
                </span>
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
                One place for every charitable operation — donors, masjids, fundraising campaigns,
                volunteer rotas, meetings, finance, audit, and community projects. Run everything
                with confidence and open the books.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  onClick={() => openUrl(DONATE_URL)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-500 px-5 py-3 text-sm font-bold text-white shadow-xl shadow-emerald-500/25 ring-1 ring-white/30 transition hover:brightness-105 active:scale-[0.99]"
                >
                  <Heart className="h-4.5 w-4.5" />
                  Donate now (Sadaqah / Zakat)
                </button>
                <button
                  onClick={() => openUrl(CHARITY_PORTAL_NEXT_URL)}
                  className="inline-flex items-center gap-2 rounded-2xl border-2 border-slate-900/10 bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-lg shadow-slate-900/5 transition hover:border-slate-900/20 hover:bg-slate-50"
                >
                  <LayoutDashboard className="h-4.5 w-4.5" />
                  Open full Charity Portal dashboard
                  <ExternalLink className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-6 rounded-2xl border border-emerald-500/15 bg-white/70 px-4 py-3 text-xs font-medium text-emerald-800 shadow-sm backdrop-blur">
                The Charity Portal Next app runs alongside iMedia3 at{" "}
                <span className="font-mono font-bold">{CHARITY_PORTAL_NEXT_URL}</span> — sign in to
                manage donors, campaigns, masjids and reports.
              </div>
            </div>

            <div className="lg:col-span-5">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
                className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_30px_60px_-20px_rgba(15,23,42,0.25)] ring-1 ring-white"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
                    <HandHeart className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
                      Ramadan 2026 · Monthly drive
                    </p>
                    <p className="mt-1 text-lg font-black text-slate-900">
                      Complete your charity plan this month
                    </p>
                  </div>
                </div>
                <ol className="mt-6 space-y-4">
                  {[
                    { n: "1", t: "Choose causes you want to support (masjids, appeals, projects)." },
                    { n: "2", t: "Set monthly sadaqah amount + one-off Zakat / Lillah donations." },
                    { n: "3", t: "Get Gift Aid reclaim prepared automatically for UK taxpayers." },
                    { n: "4", t: "Track impact live in the dashboard with receipts and thank-yous." },
                  ].map((step, idx, arr) => (
                    <li
                      key={step.n}
                      className={`flex items-start gap-3 ${
                        idx < arr.length - 1 ? "border-b border-slate-100 pb-4" : ""
                      }`}
                    >
                      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-black text-white shadow shadow-emerald-500/30">
                        {step.n}
                      </span>
                      <p className="text-sm font-medium leading-relaxed text-slate-700">{step.t}</p>
                    </li>
                  ))}
                </ol>
                <button
                  onClick={() => openUrl(DONATE_URL)}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-lg hover:bg-slate-800"
                >
                  <Send className="h-4 w-4" />
                  Support a cause today
                </button>
              </motion.div>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
            {QUICK_STATS.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200/80 ${s.tone}`}>
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <p className="text-2xl font-black text-slate-900">{s.value}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {s.label}
                  </p>
                </div>
              );
            })}
          </div>

          <section className="mt-16">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-teal-700">
                  Everything in one portal
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                  9 modules to run a charity with confidence
                </h2>
                <p className="mt-3 max-w-2xl text-base text-slate-600">
                  Built into the standalone Charity Portal app — sign in to access the full CRM.
                </p>
              </div>
              <button
                onClick={() => openUrl(CHARITY_PORTAL_NEXT_URL + "login")}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
              >
                Staff sign in <ExternalLink className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {PORTAL_FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <article
                    key={f.title}
                    className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/5"
                  >
                    <div
                      className={`mb-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${f.tone} text-white shadow-md`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.body}</p>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="mt-16">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-emerald-700">
                  Partner mosques
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                  Masjids we work with
                </h2>
                <p className="mt-3 max-w-2xl text-base text-slate-600">
                  Register more masjids and manage prayer hall bookings in the full portal.
                </p>
              </div>
              <button
                onClick={() => openUrl(CHARITY_PORTAL_NEXT_URL + "masjids")}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700"
              >
                <Building2 className="h-4 w-4" />
                View all masjids
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {MASJIDS.map((m) => (
                <article
                  key={m.id}
                  className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-emerald-50/40 p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white ring-2 ring-emerald-100 shadow-sm">
                      <Building2 className="h-5 w-5 text-emerald-700" />
                    </div>
                    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700 ring-1 ring-emerald-500/20">
                      Active
                    </span>
                  </div>
                  <h3 className="mt-4 text-xl font-black text-slate-900">{m.name}</h3>
                  <div className="mt-3 space-y-2 text-sm font-medium text-slate-600">
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                      <span>
                        {m.address}, {m.city}, {m.county} · {m.postcode}
                      </span>
                    </div>
                    {m.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 shrink-0 text-sky-700" />
                        <a href={`tel:${m.phone}`} className="hover:text-slate-900">
                          {m.phone}
                        </a>
                      </div>
                    )}
                    {m.website && (
                      <div className="flex items-center gap-2">
                        <Globe2 className="h-4 w-4 shrink-0 text-indigo-700" />
                        <button
                          onClick={() => openUrl(m.website)}
                          className="truncate text-left text-indigo-700 underline decoration-dotted underline-offset-4 hover:text-indigo-900"
                        >
                          {m.website}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      onClick={() => openUrl(CHARITY_PORTAL_NEXT_URL + `masjids/${m.id}`)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50"
                    >
                      Details <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => openUrl(CHARITY_PORTAL_NEXT_URL + "masjids/bookings")}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                    >
                      Book hall
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-20">
            <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 px-6 py-12 text-white shadow-2xl sm:px-10 sm:py-14 lg:px-14">
              <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-emerald-300">
                    Operations suite · for staff, trustees and volunteers
                  </p>
                  <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
                    Ready to run your charitable projects with full visibility?
                  </h2>
                  <p className="mt-4 text-white/70">
                    Request access from the portal login, or sign in if you already have an account.
                    Every change is audited, and all donations are tracked with optional Gift Aid.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => openUrl(CHARITY_PORTAL_NEXT_URL + "login")}
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 px-5 py-3 text-sm font-bold text-slate-900 shadow-lg shadow-emerald-500/20 hover:brightness-105"
                  >
                    <LayoutDashboard className="h-4.5 w-4.5" />
                    Staff sign in
                  </button>
                  <button
                    onClick={() => openUrl(CHARITY_PORTAL_NEXT_URL + "signup")}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-bold text-white backdrop-blur hover:bg-white/10"
                  >
                    Request access
                  </button>
                  <button
                    onClick={() => openUrl(DONATE_URL)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-900 hover:bg-slate-100"
                  >
                    <Heart className="h-4 w-4 text-rose-600" />
                    Donate
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
