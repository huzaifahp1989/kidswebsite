import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Radio,
  ArrowLeft,
  ExternalLink,
  Loader,
  CheckCircle2,
  AlertTriangle,
  Home,
  RefreshCw,
} from "lucide-react";
import { createPageUrl } from "@/utils";

const LIVE_URL = "https://app.onestream.live/hosted/g210cpv8";

function openLiveTab() {
  try {
    const w = window.open(LIVE_URL, "_blank", "noopener,noreferrer");
    if (!w) throw new Error("popup-blocked");
    return true;
  } catch (e) {
    try {
      window.location.href = LIVE_URL;
      return true;
    } catch (err) {
      return false;
    }
  }
}

export default function WatchLive() {
  const [status, setStatus] = useState("opening"); // opening | opened | failed
  const [attempts, setAttempts] = useState(0);

  const tryOpen = useCallback(() => {
    setAttempts((n) => n + 1);
    setStatus("opening");
    const ok = openLiveTab();
    setTimeout(() => setStatus(ok ? "opened" : "failed"), ok ? 350 : 120);
  }, []);

  useEffect(() => {
    tryOpen();
  }, [tryOpen]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50/40">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute -top-28 -left-20 h-72 w-72 rounded-full bg-red-500/15 blur-3xl" />
          <div className="absolute top-8 right-0 h-72 w-72 rounded-full bg-orange-400/15 blur-3xl" />
          <div className="absolute -bottom-20 left-1/3 h-72 w-72 rounded-full bg-sky-400/15 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 pt-6 pb-16 sm:px-6 sm:pt-8 lg:pt-10">
          <div className="flex items-center justify-between gap-3">
            <Link
              to={createPageUrl("Home")}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur hover:bg-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
            <a
              href={LIVE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 shadow-sm hover:bg-red-100"
            >
              <ExternalLink className="h-4 w-4" />
              Open live page
            </a>
          </div>

          <div className="mt-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-red-700 ring-1 ring-red-500/20">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
              </span>
              Live Stream
            </div>

            <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl">
              Watch{" "}
              <span className="bg-gradient-to-r from-red-600 via-rose-600 to-orange-600 bg-clip-text text-transparent">
                Islam Media Central
              </span>{" "}
              live
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              The live player is opening now in a new tab. If nothing happens after a few seconds,
              use the big button below to launch it directly.
            </p>
          </div>

          <div className="mt-10 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_30px_60px_-20px_rgba(127,29,29,0.25)] sm:p-8">
            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/30">
                  {status === "opening" ? (
                    <Loader className="h-8 w-8 animate-spin" />
                  ) : status === "opened" ? (
                    <CheckCircle2 className="h-8 w-8" />
                  ) : (
                    <AlertTriangle className="h-8 w-8" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                    {status === "opening"
                      ? "Launching live player"
                      : status === "opened"
                      ? "Live page opened"
                      : "Couldn't open automatically"}
                  </p>
                  <p className="mt-1 text-2xl font-black text-slate-900">
                    {status === "opening"
                      ? "Opening live stream…"
                      : status === "opened"
                      ? "Look for the new tab"
                      : "Pop-up blocked or redirect failed"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {status === "opening"
                      ? `Attempt ${attempts} — your browser should open the live player in a new tab.`
                      : status === "opened"
                      ? "A new tab with Islam Media Central Live is now open. Click the button below if you need to open it again."
                      : "Click the big button below to launch the live player manually."}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 self-stretch sm:self-auto">
                <button
                  onClick={tryOpen}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-6 py-4 text-base font-black text-white shadow-lg shadow-red-600/25 ring-1 ring-white/20 transition hover:bg-red-700"
                >
                  <Radio className="h-5 w-5" />
                  {status === "opened" ? "Open live page again" : "Open live page now"}
                </button>
                <Link
                  to={createPageUrl("Home")}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <Home className="h-4 w-4" />
                  Back to Home
                </Link>
              </div>
            </div>

            <div className="mt-8 grid gap-4 text-sm sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="font-black text-slate-900">Live player page</p>
                <p className="mt-2 break-all text-xs text-slate-600">{LIVE_URL}</p>
                <a
                  href={LIVE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-red-700 hover:text-red-800"
                >
                  Open directly <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="font-black text-slate-900">Still not loading?</p>
                <p className="mt-2 text-xs text-slate-600">
                  If you see a blank page on the live player, try refreshing the live tab or tap
                  play inside the player (browsers sometimes block autoplay until you interact).
                </p>
                <button
                  onClick={tryOpen}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900"
                >
                  <RefreshCw className="h-3 w-3" /> Try again — open new tab
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
