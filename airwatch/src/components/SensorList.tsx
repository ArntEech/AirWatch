// src/components/SensorList.tsx
import Link from "next/link";
import type { Pin } from "@/src/lib/pins";
import { pct, warning, ghanaDate } from "@/src/lib/format";
import LevelBadge from "./LevelBadge";

export default function SensorList({ pins }: { pins: Pin[] }) {
  const withForecast = pins
    .filter((p) => p.prob !== null)
    .sort((a, b) => (b.prob ?? 0) - (a.prob ?? 0)); // worst first
  const grey = pins.filter((p) => p.prob === null);

  // Background for warnings: ≥ 50% alert, ≥ 30% highlight
  const rowTint = { alert: "bg-red-50 dark:bg-red-950/40", highlight: "bg-amber-50 dark:bg-amber-950/30", none: "" };

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800 lg:h-[60vh]">
      <div className="border-b border-zinc-200 px-3 py-2 text-sm font-semibold dark:border-zinc-800">
        Next 24 hours · highest chance first
      </div>

      <ul className="flex-1 divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-800">
        {withForecast.map((p) => (
          <li key={p.id} className={rowTint[warning(p.prob)]}>
            <Link
              href={`/sensor/${p.id}`}
              className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <LevelBadge level={p.level} />
              <span className="flex-1 truncate text-sm">
                {p.name}
                {!p.inTraining && (
                  <span className="ml-1.5 rounded bg-indigo-100 px-1 text-[10px] text-indigo-800">NEW</span>
                )}
              </span>
              <span className="text-right text-xs tabular-nums text-zinc-600 dark:text-zinc-400">
                {p.mean24h} µg/m³
                <br />
                {pct(p.prob)} chance
              </span>
            </Link>
          </li>
        ))}

        {/* Sensors with no forecast this hour, collapsed */}
        {grey.length > 0 && (
          <li>
            <details className="px-3 py-2 text-sm text-zinc-500">
              <summary className="cursor-pointer">
                {grey.length} sensors with no forecast this hour
              </summary>
              <ul className="mt-2 space-y-1 text-xs">
                {grey.map((p) => (
                  <li key={p.id}>
                    {p.name}
                    {p.lastReading
                      ? ` · last reading ${ghanaDate(p.lastReading.time)}`
                      : " · never reported"}
                  </li>
                ))}
              </ul>
            </details>
          </li>
        )}
      </ul>
    </div>
  );
}
