// app/demo/page.tsx — Demo mode: replay a past day, then reveal reality
"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { getReplay, getSensors } from "@/src/lib/api";
import type { ReplayResponse, Sensor } from "@/src/lib/types";
import { buildReplayPins } from "@/src/lib/pins";
import {
  DEMO_DATES, FILTERS, applyFilter, scoreReplay, longDate, type TrainingFilter,
} from "@/src/lib/replay";
import ReplayTable from "@/src/components/ReplayTable";
import Legend from "@/src/components/Legend";

const SensorMap = dynamic(() => import("@/src/components/SensorMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-900">
      Loading map…
    </div>
  ),
});

export default function DemoPage() {
  const [date, setDate] = useState(DEMO_DATES[0].date);
  const [filter, setFilter] = useState<TrainingFilter>(DEMO_DATES[0].filter);
  const [reveal, setReveal] = useState(false);
  const [replay, setReplay] = useState<ReplayResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sensors, setSensors] = useState<Sensor[]>([]);

  // Sensor positions, loaded once (replay results don't include lat/lon)
  useEffect(() => {
    getSensors().then((r) => {
      if (r.ok) setSensors(r.data);
    });
  }, []);

  // Load the replay whenever the date changes
  useEffect(() => {
    let cancelled = false;
    getReplay(date).then((r) => {
      if (cancelled) return;
      if (r.ok) setReplay(r.data);
      else setError(r.error); // 400 = bad date; the message lists valid dates
    });
    return () => {
      cancelled = true;
    };
  }, [date]);

  /** Switch to another day: clear the old result and hide the answers again. */
  function choose(newDate: string, newFilter?: TrainingFilter) {
    if (newFilter) setFilter(newFilter);
    if (newDate === date) return;
    setDate(newDate);
    setReplay(null);
    setError(null);
    setReveal(false);
  }

  const shown = useMemo(
    () => (replay ? applyFilter(replay.sensors, filter) : []),
    [replay, filter]
  );
  const pins = useMemo(() => buildReplayPins(sensors, shown, reveal), [sensors, shown, reveal]);
  const score = scoreReplay(shown);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 p-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">AirWatch Accra · Demo</h1>
          <p className="text-sm text-zinc-500">
            Replay a past day: the forecasts as they were made, then what really happened
          </p>
        </div>
        <Link
          href="/"
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Back to live forecast
        </Link>
      </header>

      {/* Banner: nobody should think this is live */}
      <div className="rounded-lg border-l-4 border-amber-500 bg-amber-50 px-4 py-2 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
        <strong>Replay of {longDate(date)}</strong> · forecasts as made at 00:00 that day, using
        only data up to then. Not live.
      </div>

      {/* Prepared dates + free date picker */}
      <div className="flex flex-wrap items-end gap-2">
        {DEMO_DATES.map((d) => (
          <button
            key={d.date}
            onClick={() => choose(d.date, d.filter)}
            className={`rounded-lg border px-3 py-1.5 text-left text-sm ${
              d.date === date
                ? "border-blue-600 bg-blue-50 dark:bg-blue-950/40"
                : "border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
            }`}
          >
            <div className="font-semibold">Act {d.act} · {longDate(d.date)}</div>
            <div className="text-xs text-zinc-500">{d.note}</div>
          </button>
        ))}

        <label className="flex flex-col text-xs text-zinc-500">
          Other date (Dec 2025 onwards)
          <input
            type="date"
            min="2025-12-01"
            value={date}
            onChange={(e) => e.target.value && choose(e.target.value)}
            className="rounded border border-zinc-300 px-2 py-1 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </label>
      </div>

      {/* Filter + Reveal */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-700">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 text-sm ${
                filter === f.value
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setReveal((r) => !r)}
          disabled={!replay}
          className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {reveal ? "Hide what really happened" : "Reveal what really happened"}
        </button>
      </div>

      {/* The headline after the reveal */}
      {reveal && score.total > 0 && (
        <div className="rounded-lg bg-green-50 p-4 dark:bg-green-950/40">
          <div className="text-3xl font-bold">
            {score.right} of {score.total} levels right
          </div>
          <div className="text-sm">
            Daily averages off by {score.meanError.toFixed(1)} µg/m³ on average
            {score.noData > 0 && ` · ${score.noData} sensor(s) without enough real data to score`}
          </div>
        </div>
      )}

      {error && <p className="text-red-600">{error}</p>}
      {!replay && !error && <p className="py-10 text-center text-zinc-500">Loading replay…</p>}

      {replay && (
        <>
          <Legend />
          <div className="grid gap-4 lg:grid-cols-[1fr_460px]">
            <div className="h-[60vh] min-h-[400px]">
              <SensorMap pins={pins} linkToDetail={false} />
            </div>
            <ReplayTable sensors={shown} reveal={reveal} />
          </div>
        </>
      )}
    </main>
  );
}
