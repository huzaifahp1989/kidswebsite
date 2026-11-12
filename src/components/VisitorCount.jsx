import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { fetchVisitorTotal } from "@/lib/visitorCount";

/**
 * Unique-visitor badge for the header, shown on every page.
 *
 * Shows an em dash until the real figure arrives and keeps the em dash if the
 * counter is unreachable — it never invents a number.
 */
export default function VisitorCount() {
  const [total, setTotal] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const value = await fetchVisitorTotal();
      if (!cancelled) setTotal(value);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const known = typeof total === "number";

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-white ring-1 ring-white/25"
      title="Visitors to Islam Media Central"
      aria-label={known ? `${total.toLocaleString()} visitors` : "Visitor count not available"}
    >
      <Users className="h-3 w-3" aria-hidden="true" />
      <span className="tabular-nums" aria-hidden="true">
        {known ? total.toLocaleString() : "—"}
      </span>
    </span>
  );
}
