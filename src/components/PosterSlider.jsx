import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { POSTERS_PAGE_URL, fetchPosters, registerPosterView } from "@/lib/posters";
import { isAndroidWebView, openExternalUrl } from "@/utils/androidWebView";

const POLL_MS = 5 * 60 * 1000;
const POSTER_LIMIT = 12;

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function posterCaption(poster) {
  return String(poster?.caption || "").trim();
}

/**
 * Compact slider of the posters published from the Advertise app. The date (and
 * caption, when the poster has one) of the poster currently on screen sits just
 * below the slider and follows along as visitors swipe. Tapping a poster opens it
 * large in a full-screen viewer. New posters join the slider automatically,
 * newest first, because the feed is polled.
 */
export default function PosterSlider() {
  const [posters, setPosters] = useState([]);
  const [api, setApi] = useState(null);
  const [current, setCurrent] = useState(0);
  const [snapCount, setSnapCount] = useState(0);
  const [openIndex, setOpenIndex] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const rows = await fetchPosters(POSTER_LIMIT);
      if (!cancelled) setPosters(rows);
    };

    load();
    const timer = window.setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!api) return undefined;
    // With several posters per view there are fewer snap positions than posters,
    // so the dots are driven by the real snap list rather than the poster count.
    const update = () => {
      setCurrent(api.selectedScrollSnap());
      setSnapCount(api.scrollSnapList().length);
    };
    update();
    api.on("select", update);
    api.on("reInit", update);
    return () => {
      api.off("select", update);
      api.off("reInit", update);
    };
  }, [api]);

  // Opening a poster is also what records the view for it, using the same
  // counter the Advertise app uses so the figures on the posters page agree.
  const openViewer = useCallback((index, posterId) => {
    registerPosterView(posterId);
    setOpenIndex(index);
  }, []);

  const closeViewer = useCallback(() => setOpenIndex(null), []);

  const showPrev = useCallback(() => {
    setOpenIndex((index) => {
      if (index === null || posters.length < 2) return index;
      return (index - 1 + posters.length) % posters.length;
    });
  }, [posters.length]);

  const showNext = useCallback(() => {
    setOpenIndex((index) => {
      if (index === null || posters.length < 2) return index;
      return (index + 1) % posters.length;
    });
  }, [posters.length]);

  // While the big view is open: stop the page scrolling behind it and wire up
  // Escape / left / right so it behaves like a normal image viewer.
  useEffect(() => {
    if (openIndex === null) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape") closeViewer();
      else if (event.key === "ArrowLeft") showPrev();
      else if (event.key === "ArrowRight") showNext();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [openIndex, closeViewer, showPrev, showNext]);

  if (posters.length === 0) return null;

  const active = posters[Math.min(current, posters.length - 1)];
  const activeCaption = posterCaption(active);
  const activeDate = formatDate(active?.created_at);

  const opened = openIndex === null ? null : posters[openIndex];
  const openedCaption = posterCaption(opened);
  const openedDate = formatDate(opened?.created_at);

  return (
    <section className="border-b border-slate-200 bg-white px-3 py-2 sm:px-4">
      <div className="mx-auto w-full max-w-5xl">
        <div className="relative overflow-hidden rounded-xl bg-slate-100">
          <Carousel
            setApi={setApi}
            opts={{ loop: posters.length > 1 }}
            className="w-full"
          >
            <CarouselContent className="-ml-1.5">
              {posters.map((poster, index) => (
                // Three posters per view (each takes a third of the width).
                <CarouselItem key={poster.id} className="basis-1/3 pl-1.5">
                  <button
                    type="button"
                    onClick={() => openViewer(index, poster.id)}
                    aria-label="Open poster larger"
                    className="block w-full cursor-zoom-in"
                  >
                    <img
                      src={poster.image_url}
                      alt={posterCaption(poster) || "Poster"}
                      loading="lazy"
                      className="h-40 w-full object-contain sm:h-48 md:h-56"
                    />
                  </button>
                </CarouselItem>
              ))}
            </CarouselContent>
            {snapCount > 1 && (
              <>
                <CarouselPrevious className="left-2 top-1/2 h-8 w-8 border-white/40 bg-black/45 text-white hover:bg-black/70" />
                <CarouselNext className="right-2 top-1/2 h-8 w-8 border-white/40 bg-black/45 text-white hover:bg-black/70" />
              </>
            )}
          </Carousel>

          {snapCount > 1 && (
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
              {Array.from({ length: snapCount }).map((_, index) => (
                <button
                  key={`dot-${index}`}
                  type="button"
                  aria-label={`Go to poster group ${index + 1}`}
                  onClick={() => api?.scrollTo(index)}
                  className={`h-1.5 rounded-full transition-all ${
                    index === current ? "w-4 bg-white" : "w-1.5 bg-white/60"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {(activeCaption || activeDate) && (
          <p className="mt-1.5 text-center text-xs text-slate-500">
            {activeCaption && (
              <span className="font-semibold text-slate-700">{activeCaption}</span>
            )}
            {activeCaption && activeDate && <span className="mx-1.5 text-slate-300">•</span>}
            {activeDate}
          </p>
        )}
      </div>

      {opened && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Poster viewer"
          onClick={closeViewer}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 sm:p-6"
        >
          <button
            type="button"
            onClick={closeViewer}
            aria-label="Close"
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </button>

          {posters.length > 1 && (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  showPrev();
                }}
                aria-label="Previous poster"
                className="absolute left-2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:left-4"
              >
                <ChevronLeft className="h-7 w-7" />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  showNext();
                }}
                aria-label="Next poster"
                className="absolute right-2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-4"
              >
                <ChevronRight className="h-7 w-7" />
              </button>
            </>
          )}

          <figure
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-full max-w-full flex-col items-center"
          >
            <img
              src={opened.image_url}
              alt={openedCaption || "Poster"}
              className="max-h-[85vh] max-w-full rounded-lg object-contain"
            />
            <figcaption className="mt-2 flex flex-col items-center gap-2 text-center text-xs text-white/80">
              {(openedCaption || openedDate) && (
                <span>
                  {openedCaption}
                  {openedCaption && openedDate && <span className="mx-1.5">•</span>}
                  {openedDate}
                </span>
              )}
              <a
                href={POSTERS_PAGE_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => {
                  if (isAndroidWebView()) {
                    event.preventDefault();
                    openExternalUrl(POSTERS_PAGE_URL);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 font-semibold text-white transition hover:bg-white/25"
              >
                Open posters page
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </figcaption>
          </figure>
        </div>
      )}
    </section>
  );
}
