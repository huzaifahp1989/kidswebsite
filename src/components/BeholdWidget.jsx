import { useEffect } from "react";
import PropTypes from "prop-types";

const BEHOLD_SCRIPT_SRC = "https://w.behold.so/widget.js";
let beholdScriptPromise = null;

function loadBeholdScript() {
  if (customElements.get("behold-widget")) {
    return Promise.resolve();
  }

  if (beholdScriptPromise) {
    return beholdScriptPromise;
  }

  beholdScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${BEHOLD_SCRIPT_SRC}"]`);
    if (existing) {
      if (customElements.get("behold-widget")) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.type = "module";
    script.src = BEHOLD_SCRIPT_SRC;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return beholdScriptPromise;
}

export default function BeholdWidget({ feedId }) {
  useEffect(() => {
    loadBeholdScript().catch((err) => {
      console.error("Failed to load Behold Instagram widget:", err);
    });
  }, []);

  return <behold-widget feed-id={feedId} />;
}

BeholdWidget.propTypes = {
  feedId: PropTypes.string.isRequired,
};
