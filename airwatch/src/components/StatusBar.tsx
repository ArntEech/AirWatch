// src/components/StatusBar.tsx
import type { Health } from "@/src/lib/types";
import { ghanaTime, isStale } from "@/src/lib/format";

export default function StatusBar({
  health,
  error,
  saved = false,
}: {
  health: Health | null;
  error: string | null;
  saved?: boolean;
}) {
  const pill = "rounded px-2 py-0.5";

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
      {health && (
        <span className="text-zinc-500">
          Updated {ghanaTime(health.last_update)} · {health.sensors_forecast} sensors forecast
        </span>
      )}

      {/* Running on the saved copy (no internet / service down / offline mode) */}
      {saved && health && (
        <span className={`${pill} bg-red-100 text-red-900`}>
          Offline: showing saved forecast from {ghanaTime(health.last_update)}
        </span>
      )}

      {/* Forecast older than 2 hours */}
      {health && isStale(health.last_update) && (
        <span className={`${pill} bg-amber-100 text-amber-900`}>Forecast may be out of date</span>
      )}

      {/* The server's last hourly update failed (it still serves the previous one) */}
      {health?.error && (
        <span className={`${pill} bg-amber-100 text-amber-900`}>
          Latest update failed, showing previous forecast
        </span>
      )}

      {/* Percentages are only trustworthy when calibrated (guide, section 4) */}
      {health && health.likelihood_status !== "calibrated" && (
        <span className={`${pill} bg-amber-100 text-amber-900`}>
          Chances are experimental right now
        </span>
      )}

      {/* A refresh failed but older data is still on screen */}
      {error && health && !saved && (
        <span className={`${pill} bg-red-100 text-red-900`}>Couldn&apos;t refresh, showing last data</span>
      )}
    </div>
  );
}
