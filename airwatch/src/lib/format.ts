// src/lib/format.ts
// Levels, colours, percentages and Ghana-time formatting (guide sections 3 & 4).

import type { Level, WorstHours } from "./types";

/** Ghana's legal 24-hour limit (GS 1236:2019). Dashed line on the chart. */
export const LIMIT = 35;

export interface LevelInfo {
  label: string;
  color: string;     // pin / badge background
  textColor: string; // readable text on top of that colour
}

export const LEVELS: Record<Level, LevelInfo> = {
  good:           { label: "Good",           color: "#2E9E44", textColor: "#ffffff" },
  moderate:       { label: "Moderate",       color: "#E8B10E", textColor: "#1a1a1a" },
  unhealthy:      { label: "Unhealthy",      color: "#E8661C", textColor: "#ffffff" },
  very_unhealthy: { label: "Very unhealthy", color: "#C0262D", textColor: "#ffffff" },
};

export const NO_FORECAST: LevelInfo = {
  label: "No forecast",
  color: "#9A9A9A",
  textColor: "#ffffff",
};

/** Look up a level safely. null/undefined → grey "No forecast". */
export function levelInfo(level: Level | null | undefined): LevelInfo {
  return level ? LEVELS[level] : NO_FORECAST;
}

/** 0.36 → "36%", 0.004 → "<1%" (never show 0%), null → "". */
export function pct(p: number | null | undefined): string {
  if (p == null) return "";
  if (p < 0.01) return "<1%";
  return Math.round(p * 100) + "%";
}

/** Warning rule from the guide: highlight at ≥ 30%, alert at ≥ 50%. */
export function warning(p: number | null | undefined): "none" | "highlight" | "alert" {
  if (p == null) return "none";
  if (p >= 0.5) return "alert";
  if (p >= 0.3) return "highlight";
  return "none";
}

// All API times are UTC, which is also Ghana time. Forcing the Africa/Accra
// time zone means a phone set to another zone still shows Ghana time.
const TZ = "Africa/Accra";

/** "2026-10-29T15:06:00Z" → "15:06" */
export function ghanaTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit", timeZone: TZ,
  });
}

/** "2026-10-31T03:00:00Z" → "Sat 03:00" */
export function ghanaDayTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: TZ,
  });
}

/** "2026-10-15T13:00:00Z" → "15 Oct" */
export function ghanaDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", timeZone: TZ,
  });
}

/** Add one hour to a time (worst_hours.end is inclusive). */
export function addHour(iso: string): string {
  return new Date(new Date(iso).getTime() + 3_600_000).toISOString();
}

/** worst_hours → "Sat 03:00–07:00" */
export function worstWindow(w: WorstHours): string {
  return ghanaDayTime(w.start) + "–" + ghanaTime(addHour(w.end));
}

/** True if last_update is more than 2 hours old → "Forecast may be out of date". */
export function isStale(lastUpdate: string): boolean {
  return Date.now() - new Date(lastUpdate).getTime() > 2 * 3_600_000;
}
