import { LIVE_RADIO_STATS_URL, LIVE_RADIO_URL } from "@/constants/externalLinks";

/**
 * AzuraCast/Icecast can publish several mounts at once, so the mount matching
 * the stream the app actually plays is the one whose listeners we want.
 */
function pickSource(source) {
  if (!source) return null;
  const sources = Array.isArray(source) ? source : [source];
  const mount = LIVE_RADIO_URL.split("/").pop();
  return (
    sources.find((entry) => typeof entry?.listenurl === "string" && entry.listenurl.includes(mount)) ||
    sources[0] ||
    null
  );
}

/**
 * Live figures for the radio stream, read straight from the Icecast stats
 * endpoint (it serves CORS headers, so no proxy is needed). Returns null when
 * the server cannot be reached, so the caller can simply not show a number.
 */
export async function fetchRadioStats() {
  try {
    const response = await fetch(LIVE_RADIO_STATS_URL, { cache: "no-store" });
    if (!response.ok) return null;

    const source = pickSource((await response.json())?.icestats?.source);
    if (!source) return null;

    const listeners = Number(source.listeners);
    if (!Number.isFinite(listeners)) return null;

    const peak = Number(source.listener_peak);
    return {
      listeners,
      peak: Number.isFinite(peak) ? peak : null,
      nowPlaying: typeof source.title === "string" ? source.title : "",
    };
  } catch {
    return null;
  }
}
