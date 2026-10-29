// src/lib/replay.ts
// Demo-mode helpers: prepared dates, the in_training filter, and scoring.

import type { ReplaySensor } from "./types";

export type TrainingFilter = "all" | "trained" | "new";

export const FILTERS: { value: TrainingFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "trained", label: "Trained on" },
  { value: "new", label: "New to the model" },
];

export interface DemoDate {
  act: 1 | 2;
  date: string;          // YYYY-MM-DD
  note: string;          // shown under the button
  filter: TrainingFilter; // filter the act needs
}

// From the guide, section 8. Leads first.
export const DEMO_DATES: DemoDate[] = [
  // From the guide, section 8. In date order (oldest first).
  { act: 1, date: "2026-01-29", note: "Worst Harmattan day", filter: "trained" },
  { act: 1, date: "2026-02-16", note: "Clean day: no false alarm", filter: "trained" },
  { act: 1, date: "2026-02-26", note: "Borderline: the honest maybe", filter: "trained" },
  { act: 2, date: "2026-08-25", note: "Mpoase: unhealthy, called right", filter: "new" },
  { act: 2, date: "2026-09-05", note: "37 sensors new to the model", filter: "new" },
];


export function applyFilter(sensors: ReplaySensor[], filter: TrainingFilter): ReplaySensor[] {
  if (filter === "trained") return sensors.filter((s) => s.in_training);
  if (filter === "new") return sensors.filter((s) => !s.in_training);
  return sensors;
}

/** How many forecast levels matched reality, and the average miss in µg/m³. */
export function scoreReplay(sensors: ReplaySensor[]) {
  // Only sensors with a real average can be scored (null = too many gaps)
  const scored = sensors.filter(
    (s) => s.today.actual_level != null && s.today.actual_mean_24h != null
  );
  const right = scored.filter((s) => s.today.level === s.today.actual_level).length;
  const meanError =
    scored.length === 0
      ? 0
      : scored.reduce((sum, s) => sum + Math.abs(s.today.mean_24h - s.today.actual_mean_24h!), 0) /
        scored.length;

  return { right, total: scored.length, meanError, noData: sensors.length - scored.length };
}

/** "2026-01-29" → "29 Jan 2026" */
export function longDate(ymd: string): string {
  return new Date(ymd + "T00:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Accra",
  });
}
