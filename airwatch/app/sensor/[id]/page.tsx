// app/sensor/[id]/page.tsx
import { Suspense } from "react";
import SensorDetail from "./SensorDetail";

export default function SensorPage() {
  return (
    <Suspense fallback={<p className="p-6 text-zinc-500">Loading forecast…</p>}>
      <SensorDetail />
    </Suspense>
  );
}
