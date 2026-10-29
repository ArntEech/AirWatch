// scripts/snapshot.mjs
// Saves a fresh copy of every API response into public/fallback/.
// The app shows these files if the forecast service can't be reached.
//
// Run it (from the airwatch folder):   npm run snapshot
// Run it again on demo morning so the saved copy is fresh.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://mackey333-accra-air-forecast.hf.space";
const OUT = path.join(process.cwd(), "public", "fallback");
const DEMO_DATES = ["2026-01-29", "2026-02-26", "2026-02-16", "2026-09-05", "2026-08-25"];

/** Fetch JSON, retrying while the service wakes up (503 or no answer). */
async function get(apiPath, tries = 8) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(API + apiPath, { signal: AbortSignal.timeout(60_000) });
      if (res.ok) return await res.json();
      if (res.status !== 503) throw new Error(`HTTP ${res.status}`);
      console.log(`  ${apiPath}: service starting, retrying in 20 s...`);
    } catch (err) {
      if (i === tries) throw err;
      console.log(`  ${apiPath}: ${err.message}, retrying in 20 s...`);
    }
    await new Promise((r) => setTimeout(r, 20_000));
  }
}

async function save(fileName, apiPath) {
  const data = await get(apiPath);
  await writeFile(path.join(OUT, fileName), JSON.stringify(data));
  console.log(`saved ${fileName}`);
  return data;
}

await mkdir(OUT, { recursive: true });
console.log(`Saving snapshots from ${API}\n`);

await save("health.json", "/v1/health");
await save("sensors.json", "/v1/sensors");
const forecasts = await save("forecasts.json", "/v1/forecasts");

// One file per sensor with a forecast (for the detail screen)
for (const s of forecasts.sensors) {
  try {
    await save(`forecast_${s.id}.json`, `/v1/forecasts/${s.id}`);
  } catch (err) {
    console.log(`skipped forecast_${s.id}.json (${err.message})`); // went grey meanwhile
  }
}

// The five demo dates
for (const date of DEMO_DATES) {
  await save(`replay_${date}.json`, `/v1/replay?date=${date}`);
}

console.log("\nDone.");
