// src/components/Legend.tsx
import { LEVELS, NO_FORECAST } from "@/src/lib/format";

export default function Legend() {
  const items = [...Object.values(LEVELS), NO_FORECAST];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
      {items.map((l) => (
        <span key={l.label} className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full" style={{ background: l.color }} />
          {l.label}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-full border-2 border-black bg-zinc-300" />
        ≥ 50% chance of unhealthy air
      </span>
    </div>
  );
}
