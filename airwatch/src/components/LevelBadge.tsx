// src/components/LevelBadge.tsx
import { levelInfo } from "@/src/lib/format";
import type { Level } from "@/src/lib/types";

export default function LevelBadge({
  level,
  size = "sm",
}: {
  level: Level | null | undefined;
  size?: "sm" | "lg";
}) {
  const lvl = levelInfo(level);
  const sizing = size === "lg" ? "px-3 py-1 text-base" : "px-2 py-0.5 text-xs";
  return (
    <span
      className={`inline-block whitespace-nowrap rounded font-semibold ${sizing}`}
      style={{ background: lvl.color, color: lvl.textColor }}
    >
      {lvl.label}
    </span>
  );
}
