import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Gamepad2,
  GraduationCap,
  Headphones,
  Mic2,
  Palette,
  Radio,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { createPageUrl } from "@/utils";

const featureGroups = [
  {
    title: "Quran & worship",
    description: "Tools for reading, listening, memorising, and building daily habits.",
    icon: BookOpen,
    color: "bg-emerald-50 text-emerald-700 border-emerald-100",
    features: ["Full Quran", "Quran Hifz Assistant", "Hifz Dashboard", "Quran Dictionary", "Manzil & Hizb", "Duas", "Tajweed"],
    path: "Quran",
  },
  {
    title: "Kids learning",
    description: "Age-friendly lessons that make Islamic learning active and memorable.",
    icon: GraduationCap,
    color: "bg-sky-50 text-sky-700 border-sky-100",
    features: ["Aqeedah", "Akhlaq", "Salah", "Seerah", "Prophets", "Tawheed", "Daily Missions"],
    path: "KidsZone",
  },
  {
    title: "Games & rewards",
    description: "Quizzes, challenges, points, leaderboards, and friendly competitions.",
    icon: Gamepad2,
    color: "bg-amber-50 text-amber-800 border-amber-100",
    features: ["Islamic Kids Quiz", "Word Search", "Match the Pairs", "Flashcards", "Wudu Steps", "Surah Order", "Hajj & Umrah Simulator"],
    path: "Games",
  },
  {
    title: "Stories & knowledge",
    description: "Explore authentic stories, hadith, history, facts, and learning paths.",
    icon: Sparkles,
    color: "bg-rose-50 text-rose-700 border-rose-100",
    features: ["Islamic Stories", "Hadith", "Islamic History", "Islamic Encyclopedia", "Islamic Facts", "Learning Library", "Learning Paths"],
    path: "Stories",
  },
  {
    title: "Create & share",
    description: "Creative spaces for young Muslims to record, write, draw, and practise.",
    icon: Palette,
    color: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100",
    features: ["Kids Recording Studio", "Drawing Board", "Poetry Writing", "Creative Corner", "Worksheets", "Printable Quizzes", "Monthly Contest"],
    path: "CreativeCorner",
  },
  {
    title: "Media & community",
    description: "Audio, video, live content, family tools, and ways to stay connected.",
    icon: Radio,
    color: "bg-indigo-50 text-indigo-700 border-indigo-100",
    features: ["Islamic Videos", "Audio Library", "Audio Tafsir", "Multimedia", "WhatsApp Channel", "Parent Zone", "Child Progress"],
    path: "Videos",
  },
];

const monthlyUpdates = [
  {
    month: "August 2026",
    label: "Latest",
    items: [
      { icon: Sparkles, title: "Full feature guide", text: "A single place to discover every learning, Quran, media, and community tool." },
      { icon: Users, title: "Stay updated", text: "Quick access to newsletter, WhatsApp, and Telegram updates." },
    ],
  },
  {
    month: "July 2026",
    items: [
      { icon: Mic2, title: "Kids Recording Studio", text: "A dedicated space for children to practise and share their voice." },
      { icon: Trophy, title: "Missions and rewards", text: "Daily activities, points, competitions, and reward tracking." },
    ],
  },
  {
    month: "June 2026",
    items: [
      { icon: BookOpen, title: "Quran learning suite", text: "Hifz tools, dictionary access, dashboards, Manzil, and Hizb in one platform." },
      { icon: Headphones, title: "Expanded media", text: "More ways to learn through audio, tafsir, videos, and multimedia." },
    ],
  },
];

export default function Features() {
  return (
    <div className="pb-16">
      <section className="overflow-hidden border-b border-blue-100 bg-[#f7fbff] px-4 py-12 md:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 text-sm font-bold uppercase text-[#147d68]">
              <Sparkles className="h-4 w-4" /> Explore the platform
            </span>
            <h1 className="mt-4 text-4xl font-bold leading-tight text-[#162a46] md:text-6xl">
              Everything Islam Media Central has to offer
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
              Quran tools, children&apos;s learning, games, stories, creative activities, media, and family resources, all gathered here.
            </p>
            <a href="#whats-new" className="mt-7 inline-flex items-center gap-2 bg-[#162a46] px-5 py-3 font-semibold text-white transition hover:bg-[#203d63]">
              See what&apos;s new <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <section className="px-4 py-12 md:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase text-[#147d68]">Full feature list</p>
              <h2 className="mt-2 text-3xl font-bold text-[#162a46]">Learn, play, create, and connect</h2>
            </div>
            <ShieldCheck className="hidden h-9 w-9 text-[#147d68] sm:block" />
          </div>

          <div className="grid gap-px overflow-hidden border border-slate-200 bg-slate-200 md:grid-cols-2 lg:grid-cols-3">
            {featureGroups.map((group) => {
              const Icon = group.icon;
              return (
                <article key={group.title} className="flex min-h-[340px] flex-col bg-white p-6 md:p-7">
                  <div className={`flex h-11 w-11 items-center justify-center border ${group.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-xl font-bold text-[#162a46]">{group.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{group.description}</p>
                  <ul className="mt-5 flex-1 space-y-2 text-sm text-slate-700">
                    {group.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 bg-[#147d68]" /> {feature}
                      </li>
                    ))}
                  </ul>
                  <Link to={createPageUrl(group.path)} className="mt-6 inline-flex items-center gap-2 font-semibold text-[#1d4ed8] hover:text-[#162a46]">
                    Explore <ArrowRight className="h-4 w-4" />
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="whats-new" className="scroll-mt-36 border-y border-slate-200 bg-white px-4 py-12 md:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center bg-[#f5b800] text-[#162a46]">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase text-[#147d68]">Release timeline</p>
              <h2 className="text-3xl font-bold text-[#162a46]">What&apos;s new by month</h2>
            </div>
          </div>

          <div className="space-y-10">
            {monthlyUpdates.map((release) => (
              <div key={release.month} className="grid gap-5 md:grid-cols-[180px_1fr]">
                <div>
                  <h3 className="font-bold text-[#162a46]">{release.month}</h3>
                  {release.label && <span className="mt-2 inline-block bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800">{release.label}</span>}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {release.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <article key={item.title} className="border-l-4 border-[#147d68] bg-slate-50 p-5">
                        <Icon className="h-5 w-5 text-[#147d68]" />
                        <h4 className="mt-3 font-bold text-[#162a46]">{item.title}</h4>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}