// src/components/DayCard.tsx
import type { DaySummary } from "@/src/lib/types";
import { pct, warning } from "@/src/lib/format";
import LevelBadge from "./LevelBadge";

export default function DayCard({ title, day }: { title: string; day: DaySummary }) {
  const w = warning(day.prob_unhealthy);
  const border =
    w === "alert" ? "border-red-500"
    : w === "highlight" ? "border-amber-400"
    : "border-zinc-200 dark:border-zinc-800";

  return (
    <div className={`rounded-lg border-2 p-4 ${border}`}>
      <div className="text-sm text-zinc-500">{title}</div>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <LevelBadge level={day.level} size="lg" />
        <span className="text-2xl font-semibold tabular-nums">
          {day.mean_24h}
          <span className="text-sm font-normal text-zinc-500"> µg/m³ average</span>
        </span>
      </div>

      <div className="mt-2 text-sm">
        {w === "alert" && "⚠ "}
        {pct(day.prob_unhealthy)} chance of unhealthy air
      </div>
    </div>
  );
}
