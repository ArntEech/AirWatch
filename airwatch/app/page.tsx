// app/page.tsx — Home: live map + list
"use client";

import dynamic from "next/dynamic";
import { useLiveData } from "@/src/lib/useLiveData";
import SensorList from "@/src/components/SensorList";
import StatusBar from "@/src/components/StatusBar";
import Legend from "@/src/components/Legend";
import Link from "next/dist/client/link";


// Load the map in the browser only (Leaflet needs `window`)
const SensorMap = dynamic(() => import("@/src/components/SensorMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-900">
      Loading map…
    </div>
  ),
});

export default function Home() {
  const { pins, health, error, saved, loading } = useLiveData();

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 p-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">AirWatch Accra</h1>
          <p className="text-sm text-zinc-500">
            Air-quality forecast near each sensor, for the next 48 hours
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Link
            href="/demo"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Demo mode →
          </Link>
          <StatusBar health={health} error={error} saved={saved} />
        </div>
      </header>

      <Legend />

      {loading && !error && (
        <p className="py-10 text-center text-zinc-500">
          Loading forecasts… (if the server was asleep this can take a few minutes)
        </p>
      )}

      {loading && error && (
        <p className="py-10 text-center text-red-600">
          {error}. Check your internet connection and refresh the page.
        </p>
      )}

      {!loading && (
        // Map and list side by side on large screens, stacked on phones
        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <div className="h-[60vh] min-h-[400px]">
            <SensorMap pins={pins} />
          </div>
          <SensorList pins={pins} />
        </div>
      )}
    </main>
  );
}
