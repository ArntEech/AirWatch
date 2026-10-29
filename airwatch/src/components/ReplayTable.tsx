// src/components/ReplayTable.tsx
import type { ReplaySensor } from "@/src/lib/types";
import { pct } from "@/src/lib/format";
import LevelBadge from "./LevelBadge";

export default function ReplayTable({
  sensors,
  reveal,
}: {
  sensors: ReplaySensor[];
  reveal: boolean;
}) {
  // Highest chance first, like the live list
  const rows = [...sensors].sort((a, b) => b.today.prob_unhealthy - a.today.prob_unhealthy);

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800 lg:h-[60vh]">
      <div className="border-b border-zinc-200 px-3 py-2 text-sm font-semibold dark:border-zinc-800">
        {sensors.length} sensors · forecast for the day{reveal && " vs what really happened"}
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white text-left text-xs text-zinc-500 dark:bg-zinc-950">
            <tr>
              <th className="px-3 py-2 font-medium">Sensor</th>
              <th className="py-2 font-medium">Forecast</th>
              {reveal && (
                <>
                  <th className="py-2 font-medium">Really</th>
                  <th className="py-2 pr-3 text-center font-medium">Match</th>
                </>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {rows.map((s) => {
              const t = s.today;
              const scored = t.actual_level != null && t.actual_mean_24h != null;
              const match = scored && t.level === t.actual_level;
              const tint = !reveal || !scored ? ""
                : match ? "bg-green-50 dark:bg-green-950/30"
                : "bg-red-50 dark:bg-red-950/30";

              return (
                <tr key={s.id} className={tint}>
                  <td className="px-3 py-2">
                    {s.name}
                    {!s.in_training && (
                      <span className="ml-1.5 rounded bg-indigo-100 px-1 text-[10px] text-indigo-800">NEW</span>
                    )}
                  </td>

                  <td className="py-2">
                    <div className="flex items-center gap-1.5">
                      <LevelBadge level={t.level} />
                      <span className="tabular-nums">{t.mean_24h}</span>
                    </div>
                    <div className="text-xs text-zinc-500">{pct(t.prob_unhealthy)} chance</div>
                  </td>

                  {reveal && (
                    <>
                      <td className="py-2">
                        {scored ? (
                          <div className="flex items-center gap-1.5">
                            <LevelBadge level={t.actual_level} />
                            <span className="tabular-nums">{t.actual_mean_24h}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-500">no data (gaps)</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-center text-lg">
                        {!scored ? "–" : match
                          ? <span className="text-green-700">✓</span>
                          : <span className="text-red-700">✗</span>}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
