// src/lib/types.ts
// The shape of every API response. Mirrors section 5 of the API guide.

// The four air-quality levels (24-hour average PM2.5)
export type Level = "good" | "moderate" | "unhealthy" | "very_unhealthy";

// ---------- GET /v1/health ----------
export interface Health {
  status: "ok" | "starting";
  model: string;                // e.g. "fm-llm-aq-run2"
  last_update: string;          // UTC time, e.g. "2026-10-29T15:06:00Z"
  sensors_forecast: number;     // how many sensors have a forecast this hour
  likelihood_status: "calibrated" | "uncalibrated";
  error?: string;               // only there if the last hourly update failed
}

// ---------- GET /v1/sensors ----------
export interface Sensor {
  id: string;                   // TEXT, not a number. Always key by id (names repeat)
  name: string;
  lat: number;
  lon: number;
  last_reading: { time: string; pm25: number } | null; // null = never reported
  forecast_available: boolean;  // false = grey pin
  in_training: boolean;         // false = "new to the model"
}

// One 24-hour summary ("today" = next 24 h, "tomorrow" = following 24 h)
export interface DaySummary {
  mean_24h: number;             // expected average, µg/m³
  level: Level;
  prob_unhealthy: number;       // 0–1, chance the 24-h average is ≥ 35
}

// ---------- GET /v1/forecasts ----------
export interface ForecastSummary {
  id: string;
  name: string;
  today: DaySummary;
  tomorrow: DaySummary;
  in_training: boolean;
}

export interface ForecastsResponse {
  issued_at: string;
  sensors: ForecastSummary[];   // ONLY sensors with a forecast
}

// ---------- GET /v1/forecasts/{id} ----------
export interface Reading {
  time: string;
  pm25: number | null;          // null = missed hour → draw a gap, never 0
}

export interface HourlyForecast {
  time: string;
  pm25: number;                 // the forecast line
  low: number;                  // bottom of the likely range (80%)
  high: number;                 // top of the likely range
}

export interface DailyForecast extends DaySummary {
  date: string;                 // date the 24-h window STARTS (don't show as a label)
}

export interface WorstHours {
  start: string;
  end: string;                  // LAST hour of the 4 (inclusive) → display end + 1 h
  pm25_peak: number;
}

export interface ForecastDetail {
  id: string;
  name: string;
  issued_at: string;            // "now" marker on the chart
  forecast_start: string;       // first forecast hour (often 1–3 h before now)
  recent: Reading[];            // 48 real hours, oldest first
  hourly: HourlyForecast[];     // 48 forecast hours
  daily: DailyForecast[];       // [0] = next 24 h, [1] = following 24 h
  worst_hours: WorstHours;
  message: string;              // ready-made sentence
  in_training: boolean;
}

// ---------- GET /v1/replay?date=YYYY-MM-DD ----------
export interface ReplayDay extends DaySummary {
  actual_mean_24h: number | null; // what really happened (null = not enough data)
  actual_level: Level | null;
}

export interface ReplaySensor {
  id: string;
  name: string;
  today: ReplayDay;
  tomorrow: DaySummary;         // no actual values for tomorrow
  in_training: boolean;
}

export interface ReplayResponse {
  issued_at: string;            // 00:00 on the requested date
  mode: "replay";
  sensors: ReplaySensor[];
}

// ---------- What our API functions return ----------
// Either it worked (ok: true + data) or it didn't (ok: false + a message to show).
export type ApiResult<T> =
  | { ok: true; data: T; saved?: boolean } // saved = true → from public/fallback, not live
  | { ok: false; error: string; status: number };

