// src/components/ForecastChart.tsx
// The detail chart (guide p.9): ① real readings ② gaps ③ forecast line
// ④ likely range ⑤ limit line at 35 ⑥ "Now" marker ⑦ worst-hours window
"use client";

import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, ReferenceArea,
} from "recharts";
import type { ForecastDetail } from "@/src/lib/types";
import { LIMIT, addHour, ghanaDayTime } from "@/src/lib/format";

// One row per hour on the shared time axis
interface ChartRow {
  t: number;                 // time in milliseconds (what the x-axis uses)
  observed?: number | null;  // real reading (null = missed hour → gap)
  forecast?: number;         // forecast line
  band?: [number, number];   // [low, high] likely range
}

const ms = (iso: string) => new Date(iso).getTime();
const label = (t: number) => ghanaDayTime(new Date(t).toISOString());
const TWELVE_HOURS = 12 * 3_600_000;

export default function ForecastChart({ detail }: { detail: ForecastDetail }) {
  // Past 48 h of real readings, then 48 h of forecast
  const rows: ChartRow[] = [
    ...detail.recent.map((r) => ({ t: ms(r.time), observed: r.pm25 })),
    ...detail.hourly.map((h) => ({
      t: ms(h.time),
      forecast: h.pm25,
      band: [h.low, h.high] as [number, number],
    })),
  ];

  const first = rows[0].t;
  const last = rows[rows.length - 1].t;

  // X-axis labels every 12 hours, at 00:00 and 12:00
  const ticks: number[] = [];
  for (let t = Math.ceil(first / TWELVE_HOURS) * TWELVE_HOURS; t <= last; t += TWELVE_HOURS) {
    ticks.push(t);
  }

  const now = ms(detail.issued_at);
  const worstFrom = ms(detail.worst_hours.start);
  const worstTo = ms(addHour(detail.worst_hours.end)); // end is inclusive → +1 h

  return (
    // "currentColor" in the chart = this div's text colour, so the
    // real-readings line and labels stay readable in light AND dark mode
    <div className="text-slate-800 dark:text-slate-200">
      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={rows} margin={{ top: 20, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="currentColor" strokeOpacity={0.1} />

          <XAxis
            dataKey="t" type="number" scale="time"
            domain={[first, last]} ticks={ticks} tickFormatter={label}
            tick={{ fontSize: 11, fill: "currentColor" }}
          />
          <YAxis
            width={44}
            tick={{ fontSize: 11, fill: "currentColor" }}
            label={{ value: "PM2.5 (µg/m³)", angle: -90, position: "insideLeft", fontSize: 11, fill: "currentColor" }}
          />

          {/* ⑦ Worst 4 hours, shaded orange */}
          <ReferenceArea
            x1={worstFrom} x2={worstTo} fill="#E8661C" fillOpacity={0.15}
            label={{ value: "Worst hours", position: "insideTop", fontSize: 10, fill: "#E8661C" }}
          />

          {/* ④ Likely range: an Area whose value is [low, high] draws a band */}
          <Area dataKey="band" stroke="none" fill="#3b82f6" fillOpacity={0.18} isAnimationActive={false} />

          {/* ①② Real readings. connectNulls={false} → missed hours are gaps */}
          <Line
            dataKey="observed" stroke="currentColor" strokeWidth={2}
            dot={{ r: 1.5 }} connectNulls={false} isAnimationActive={false}
          />

          {/* ③ Forecast line */}
          <Line dataKey="forecast" stroke="#2563eb" strokeWidth={2.5} dot={false} isAnimationActive={false} />

          {/* ⑤ Ghana's legal limit */}
          <ReferenceLine
            y={LIMIT} stroke="#C0262D" strokeDasharray="6 4"
            label={{ value: "Ghana limit 35", position: "insideTopRight", fontSize: 10, fill: "#C0262D" }}
          />

          {/* ⑥ Now */}
          <ReferenceLine
            x={now} stroke="currentColor" strokeDasharray="3 3"
            label={{ value: "Now", position: "top", fontSize: 11, fill: "currentColor" }}
          />

          {/* Hover box */}
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as ChartRow;
              return (
                <div className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900 shadow">
                  <div className="font-semibold">{label(row.t)}</div>
                  {row.observed !== undefined && (
                    <div>Measured: {row.observed == null ? "no reading" : `${row.observed} µg/m³`}</div>
                  )}
                  {row.forecast !== undefined && <div>Forecast: {row.forecast} µg/m³</div>}
                  {row.band && <div>Likely range: {row.band[0]}–{row.band[1]}</div>}
                </div>
              );
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Key under the chart */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 bg-current" />Measured</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 bg-blue-600" />Forecast</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-5 bg-blue-500/20" />Likely range (8 times in 10)</span>
        <span className="flex items-center gap-1.5"><span className="w-5 border-t-2 border-dashed border-[#C0262D]" />Ghana limit</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-5 bg-[#E8661C]/20" />Worst 4 hours</span>
      </div>
    </div>
  );
}
