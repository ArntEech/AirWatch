// src/lib/useLiveData.ts
"use client";

import { useEffect, useMemo, useState } from "react";
import { getSensors, getForecasts, getHealth } from "./api";
import { buildLivePins, type Pin } from "./pins";
import type { Sensor, ForecastsResponse, Health } from "./types";

const POLL_MS = 15 * 60 * 1000; // 15 minutes (forecasts change hourly at ~:05)

export function useLiveData() {
  const [sensors, setSensors] = useState<Sensor[] | null>(null);
  const [forecasts, setForecasts] = useState<ForecastsResponse | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false); // true = showing saved files, not live


  useEffect(() => {
    let cancelled = false; // stops updates after the user leaves the page

    async function load() {
      const [s, f, h] = await Promise.all([getSensors(), getForecasts(), getHealth()]);
      if (cancelled) return;

      // Only overwrite on success → a failed refresh keeps the last good data
      if (s.ok) setSensors(s.data);
      if (f.ok) setForecasts(f.data);
      if (h.ok) setHealth(h.data);

      const failed = [s, f, h].find((r) => !r.ok);
      setError(failed && !failed.ok ? failed.error : null);

      // Did any of the three answers come from the saved files?
      setSaved([s, f, h].some((r) => r.ok && r.saved === true));

    }

    load();                                 // load now…
    const timer = setInterval(load, POLL_MS); // …and every 15 minutes
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  // Rebuild the pins only when sensors or forecasts change
  const pins: Pin[] = useMemo(
    () => (sensors ? buildLivePins(sensors, forecasts) : []),
    [sensors, forecasts]
  );

  return { pins, health, error, saved, loading: sensors === null };

}
