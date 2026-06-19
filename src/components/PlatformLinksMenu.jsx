import { useState } from "react";
import {
  BookOpen,
  ExternalLink,
  Gamepad2,
  LayoutGrid,
  Megaphone,
  Music,
  Radio,
  Video,
  X,
} from "lucide-react";
import { isAndroidWebView, openExternalUrl } from "@/utils/androidWebView";
import { Button } from "@/components/ui/button";

function handlePlatformLink(url, closeMenu) {
  closeMenu();
  openExternalUrl(url);
}

const platformLinks = [
  {
    label: "Kids Zone",
    description: "Islamic learning games and quizzes",
    href: "https://islamic-kids-platform.vercel.app/",
    icon: Gamepad2,
    accent: "from-emerald-500 to-teal-600",
  },
  {
    label: "Advert",
    description: "Sponsors and community ads",
    href: "https://traeadvert8pia.vercel.app/",
    icon: Megaphone,
    accent: "from-orange-500 to-amber-600",
  },
  {
    label: "Media",
    description: "Islamic audio library",
    href: "https://create-me-a-audio.vercel.app/",
    icon: Music,
    accent: "from-purple-500 to-indigo-600",
  },
  {
    label: "Stream",
    description: "Live radio and broadcasts",
    href: "https://traet2lhw4m4.vercel.app/",
    icon: Radio,
    accent: "from-blue-600 to-sky-600",
  },
  {
    label: "Quran",
    description: "Listen to reciters and essentials",
    href: "https://traet2lhw4m4.vercel.app/#quran",
    icon: BookOpen,
    accent: "from-green-600 to-emerald-700",
  },
  {
    label: "Videos",
    description: "Islamic video platform",
    href: "https://create-me-videos-website.vercel.app/",
    icon: Video,
    accent: "from-rose-500 to-pink-600",
  },
];

export default function PlatformLinksMenu() {
  const [open, setOpen] = useState(false);

  const closeMenu = () => {
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 left-4 z-[9998] flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#1e3a8a] to-[#1d4ed8] text-white shadow-lg ring-2 ring-white/90 transition hover:scale-105 hover:shadow-xl active:scale-95 md:bottom-24 md:left-6 md:h-12 md:w-12"
        aria-label="Open platforms menu"
        title="Platforms"
      >
        <LayoutGrid className="h-5 w-5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[10001] flex items-end justify-center p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="platform-links-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close platform menu"
            onClick={closeMenu}
          />

          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border bg-white shadow-2xl">
            <div className="bg-gradient-to-br from-[#1e3a8a] to-[#1d4ed8] px-5 py-4 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="platform-links-title" className="text-xl font-bold">
                    Explore Our Platforms
                  </h2>
                  <p className="mt-1 text-sm text-blue-100">
                    Jump to Kids Zone, media, stream, Quran, and more
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeMenu}
                  className="rounded-full p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-3 sm:p-4">
              <div className="grid gap-2">
                {platformLinks.map((item) => {
                  const Icon = item.icon;
                  const linkClassName =
                    "flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 transition hover:border-blue-200 hover:bg-blue-50 w-full text-left";

                  if (isAndroidWebView()) {
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => handlePlatformLink(item.href, closeMenu)}
                        className={linkClassName}
                      >
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${item.accent} text-white shadow-sm`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-gray-900">{item.label}</span>
                            <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                          </div>
                          <p className="truncate text-xs text-gray-500">{item.description}</p>
                        </div>
                      </button>
                    );
                  }

                  return (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={closeMenu}
                      className={linkClassName}
                    >
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${item.accent} text-white shadow-sm`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-gray-900">{item.label}</span>
                          <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                        </div>
                        <p className="truncate text-xs text-gray-500">{item.description}</p>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
              <Button
                type="button"
                variant="outline"
                onClick={closeMenu}
                className="w-full"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
