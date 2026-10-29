// src/lib/api.ts
// One function per endpoint. All calls go through getJSON(), which handles:
//  • a sleeping server (slow first call) and 503 "starting up" → wait and retry
//  • 400 / 404 → return the server's message straight away
//  • no answer (no internet, service down) → use the saved copy in public/fallback/

import type {
  ApiResult, Health, Sensor, ForecastsResponse, ForecastDetail, ReplayResponse,
} from "./types";

// Base URL. To point at Mackey's laptop, put this in airwatch/.env.local:
//   NEXT_PUBLIC_API_URL=http://<laptop-ip>:<port>
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "https://mackey333-accra-air-forecast.hf.space";

// Forced offline mode for demo day. In airwatch/.env.local:
//   NEXT_PUBLIC_OFFLINE=1
// The app then only uses the saved files (restart `npm run dev` after changing).
const OFFLINE = process.env.NEXT_PUBLIC_OFFLINE === "1";

const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));
const UNREACHABLE = { ok: false as const, error: "Forecast service unreachable", status: 0 };

// ---------- Saved copies (public/fallback/, made by `npm run snapshot`) ----------

/** Which saved file answers this API path (null = none). */
function fallbackFile(path: string): string | null {
  if (path === "/v1/health") return "health.json";
  if (path === "/v1/sensors") return "sensors.json";
  if (path === "/v1/forecasts") return "forecasts.json";

  const detail = path.match(/^\/v1\/forecasts\/(.+)$/);
  if (detail) return `forecast_${decodeURIComponent(detail[1])}.json`;

  const replay = path.match(/^\/v1\/replay\?date=(\d{4}-\d{2}-\d{2})$/);
  if (replay) return `replay_${replay[1]}.json`;

  return null;
}

/** Read the saved copy from our own app (works without internet). */
async function getSaved<T>(path: string): Promise<ApiResult<T> | null> {
  const file = fallbackFile(path);
  if (!file) return null;
  try {
    const res = await fetch("/fallback/" + file, { cache: "no-store" });
    if (!res.ok) return null; // no saved copy of this one
    return { ok: true, data: (await res.json()) as T, saved: true };
  } catch {
    return null;
  }
}

// ---------- Live calls ----------

async function getJSON<T>(
  path: string,
  { retries = 6, waitMs = 20_000 }: { retries?: number; waitMs?: number } = {}
): Promise<ApiResult<T>> {
  if (OFFLINE) {
    return (await getSaved<T>(path)) ?? { ok: false, error: "No saved data for this (offline mode)", status: 0 };
  }

  let noAnswer = 0; // times in a row the server didn't answer at all

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // The first call can take up to ~60 s if the server was asleep
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 60_000);
      const res = await fetch(API_BASE + path, { signal: ctrl.signal, cache: "no-store" });
      clearTimeout(timer);

      if (res.status === 503) throw new Error("starting"); // waking up → retry

      const body = await res.json();
      if (!res.ok) {
        // 400 (bad replay date) / 404 (unknown or grey sensor): show the message
        return { ok: false, error: body.error ?? "Request failed", status: res.status };
      }
      return { ok: true, data: body as T };
    } catch (err) {
      const starting = err instanceof Error && err.message === "starting";
      if (!starting) noAnswer++;

      // No answer twice, or out of retries → use the saved copy if we have one
      if (noAnswer >= 2 || attempt === retries) {
        const saved = await getSaved<T>(path);
        if (saved) return saved;
        if (attempt === retries) return UNREACHABLE;
      }

      // 503 = it's coming back, wait the full 20 s; no answer = retry sooner
      await wait(starting ? waitMs : 5_000);
    }
  }
  return UNREACHABLE;
}

// ---------- One function per endpoint ----------

/** Is the service working? When were forecasts last made? */
export const getHealth = () => getJSON<Health>("/v1/health");

/** All sensors with position and last reading (map pins). */
export const getSensors = () => getJSON<Sensor[]>("/v1/sensors");

/** Today/tomorrow summary for every sensor with a forecast (pin colours). */
export const getForecasts = () => getJSON<ForecastsResponse>("/v1/forecasts");

/** Full 48-hour detail for one sensor (detail screen). */
export const getForecast = (id: string) =>
  getJSON<ForecastDetail>("/v1/forecasts/" + encodeURIComponent(id));

/** Demo mode: forecasts as made at 00:00 on `date`, plus what really happened. */
export const getReplay = (date: string) =>
  getJSON<ReplayResponse>("/v1/replay?date=" + encodeURIComponent(date));
