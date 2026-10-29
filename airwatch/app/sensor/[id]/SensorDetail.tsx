// app/sensor/[id]/SensorDetail.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getForecast, getSensors } from "@/src/lib/api";
import type { ForecastDetail, Sensor } from "@/src/lib/types";
import { LIMIT, ghanaTime, ghanaDate, worstWindow } from "@/src/lib/format";
import ForecastChart from "@/src/components/ForecastChart";
import DayCard from "@/src/components/DayCard";

const POLL_MS = 15 * 60 * 1000;

export default function SensorDetail() {
  const { id } = useParams<{ id: string }>(); // from the URL: /sensor/<id>

  const [detail, setDetail] = useState<ForecastDetail | null>(null);
  const [error, setError] = useState<{ message: string; status: number } | null>(null);
  const [sensor, setSensor] = useState<Sensor | null>(null); // only for the 404 case
  const [saved, setSaved] = useState(false);


  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await getForecast(id);
      if (cancelled) return;

      if (res.ok) {
        setDetail(res.data);
        setSaved(res.saved === true);
        setError(null);
        return;
      }

      setError({ message: res.error, status: res.status });

      // 404 = unknown or grey sensor → look up its last reading instead
      if (res.status === 404) {
        const s = await getSensors();
        if (!cancelled && s.ok) setSensor(s.data.find((x) => x.id === id) ?? null);
      }
    }

    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [id]);

  const back = (
    <Link href="/" className="text-sm text-blue-600 hover:underline">
      ← Back to map
    </Link>
  );

  // ---------- Still loading ----------
  if (!detail && !error) {
    return <main className="mx-auto max-w-4xl p-4">{back}<p className="mt-6 text-zinc-500">Loading forecast…</p></main>;
  }

  // ---------- No forecast (grey sensor, bad id, or service down) ----------
  if (!detail && error) {
    return (
      <main className="mx-auto max-w-4xl space-y-3 p-4">
        {back}
        <h1 className="text-2xl font-bold">{sensor?.name ?? "Sensor " + id}</h1>
        {error.status === 404 ? (
          <>
            <p>No forecast for this sensor right now.</p>
            <p className="text-sm text-zinc-500">
              It may have stopped reporting, or has too many gaps in its last 28 days.
              It comes back automatically when it reports again.
            </p>
            {sensor?.last_reading && (
              <p className="text-sm">
                Last reading: {sensor.last_reading.pm25} µg/m³ on {ghanaDate(sensor.last_reading.time)} at{" "}
                {ghanaTime(sensor.last_reading.time)}
              </p>
            )}
          </>
        ) : (
          <p className="text-red-600">{error.message}</p>
        )}
      </main>
    );
  }

  // ---------- The forecast ----------
  const d = detail!; // safe: both "no detail" cases returned above
  const peak = d.worst_hours.pm25_peak;

  return (
    <main className="mx-auto w-full max-w-4xl space-y-5 p-4">
      {back}

      <header>
        <h1 className="text-2xl font-bold">{d.name}</h1>
        <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
          Forecast near this sensor · made at {ghanaTime(d.issued_at)}
          {!d.in_training && (
            <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-xs text-indigo-800">New to the model</span>
          )}
          {error && <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-900">Couldn&apos;t refresh, showing last data</span>}
        </p>
      </header>

      <section className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
        <ForecastChart detail={d} />
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <DayCard title="Next 24 hours" day={d.daily[0]} />
        <DayCard title="Following 24 hours" day={d.daily[1]} />
      </div>

      {/* The ready-made sentence from the API */}
      <p className="rounded-lg bg-zinc-100 p-4 dark:bg-zinc-900">{d.message}</p>

      {/* Only worth mentioning when the peak reaches the limit */}
      {peak >= LIMIT && (
        <p className="text-sm">
          <strong>Worst hours:</strong> {worstWindow(d.worst_hours)}, up to {Math.round(peak)} µg/m³
        </p>
      )}
    </main>
  );
}
