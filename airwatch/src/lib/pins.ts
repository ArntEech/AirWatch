// src/lib/pins.ts
// Turns API data into "pins": one object per sensor with everything the map
// and list need. Live mode and demo mode (Step 8) both produce Pins, so the
// same map and list components work for both.

import type { Level, Sensor, ForecastsResponse, ReplaySensor } from "./types";


export interface Pin {
  id: string;
  name: string;
  lat: number;
  lon: number;
  level: Level | null;       // null = no forecast → grey pin
  mean24h: number | null;    // expected 24-h average (µg/m³)
  prob: number | null;       // chance of unhealthy (0–1)
  inTraining: boolean;       // false = "New to the model"
  lastReading: Sensor["last_reading"];
  // Demo mode only (filled in Step 8):
  actualMean24h?: number | null;
  actualLevel?: Level | null;
}

/** Live mode: join sensors (positions) with forecasts (today's level) by id. */
export function buildLivePins(
  sensors: Sensor[],
  forecasts: ForecastsResponse | null
): Pin[] {
  // Lookup table: id → forecast. Sensors missing from it are the grey ones.
  const byId = new Map((forecasts?.sensors ?? []).map((f) => [f.id, f]));

  return sensors.map((s) => {
    const fc = byId.get(s.id);
    return {
      id: s.id,
      name: s.name,
      lat: s.lat,
      lon: s.lon,
      level: fc?.today.level ?? null,
      mean24h: fc?.today.mean_24h ?? null,
      prob: fc?.today.prob_unhealthy ?? null,
      inTraining: s.in_training,
      lastReading: s.last_reading,
    };
  });
}

/**
 * Several sensors share exactly the same coordinates, so their pins would sit
 * on top of each other. This places each group in a small circle around the
 * real spot. It only changes where the pin is drawn, not the data.
 */
export function spreadOverlapping(pins: Pin[]): Pin[] {
  const groups = new Map<string, Pin[]>();
  for (const p of pins) {
    const key = p.lat.toFixed(4) + "," + p.lon.toFixed(4);
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }

  return [...groups.values()].flatMap((group) => {
    if (group.length === 1) return group;
    const radius = 0.0015 + 0.0008 * group.length; // degrees (~200–700 m)
    return group.map((p, i) => {
      const angle = (2 * Math.PI * i) / group.length;
      return {
        ...p,
        lat: p.lat + radius * Math.sin(angle),
        lon: p.lon + radius * Math.cos(angle),
      };
    });
  });
}

/** Demo mode: replay results + sensor positions → pins. */
export function buildReplayPins(
  sensors: Sensor[],         // from /v1/sensors (for lat/lon)
  replay: ReplaySensor[],    // from /v1/replay (already filtered)
  reveal: boolean            // true = include what really happened
): Pin[] {
  const position = new Map(sensors.map((s) => [s.id, s]));

  return replay.flatMap((r) => {
    const s = position.get(r.id);
    if (!s) return []; // no known position → can't draw it

    return [{
      id: r.id,
      name: r.name,
      lat: s.lat,
      lon: s.lon,
      level: r.today.level,
      mean24h: r.today.mean_24h,
      prob: r.today.prob_unhealthy,
      inTraining: r.in_training,
      lastReading: null,
      // Only after the reveal:
      ...(reveal
        ? { actualMean24h: r.today.actual_mean_24h, actualLevel: r.today.actual_level }
        : {}),
    }];
  });
}
