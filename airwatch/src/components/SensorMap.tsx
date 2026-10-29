// src/components/SensorMap.tsx
// The sensor map, using Leaflet directly (no react-leaflet).
// Why: Next.js 16 hides pages you navigate away from instead of removing
// them. react-leaflet can't rebuild its map after that, so we create the map
// in an effect (runs every time the page is shown) and remove it in the
// cleanup (runs every time it is hidden).
"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { spreadOverlapping, type Pin } from "@/src/lib/pins";
import { levelInfo, pct, warning, ghanaDate, type LevelInfo } from "@/src/lib/format";

const ACCRA: L.LatLngTuple = [5.6, -0.19];

export default function SensorMap({
  pins,
  linkToDetail = true, // demo mode turns this off (replay has no detail screen)
}: {
  pins: Pin[];
  linkToDetail?: boolean;
}) {
  const divRef = useRef<HTMLDivElement>(null);       // the <div> Leaflet draws into
  const mapRef = useRef<L.Map | null>(null);         // the Leaflet map
  const layerRef = useRef<L.LayerGroup | null>(null); // holds all the pins
  const needsFitRef = useRef(true);                  // zoom to fit pins once per new map
  const router = useRouter();

  // ---- 1. Create the map when the page is shown, remove it when hidden ----
  useEffect(() => {
    if (!divRef.current) return;

    const map = L.map(divRef.current, { center: ACCRA, zoom: 11, scrollWheelZoom: true });

    // Free OpenStreetMap background, no key needed
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    needsFitRef.current = true;

    // Popup links: move inside the app instead of reloading the whole page
    map.on("popupopen", (e: L.PopupEvent) => {
      const link = e.popup.getElement()?.querySelector<HTMLAnchorElement>("a[data-nav]");
      link?.addEventListener("click", (ev) => {
        ev.preventDefault();
        router.push(link.getAttribute("href")!);
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, [router]);

  // ---- 2. Draw the pins (runs after step 1, and again whenever pins change) ----
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    // Spread stacked pins; draw grey ones first so coloured ones sit on top
    const placed = spreadOverlapping(pins).sort(
      (a, b) => Number(a.level !== null) - Number(b.level !== null)
    );

    for (const p of placed) {
      const lvl = levelInfo(p.level);
      const alert = warning(p.prob) === "alert";
      L.circleMarker([p.lat, p.lon], {
        radius: alert ? 11 : 8,
        fillColor: lvl.color,
        fillOpacity: p.level ? 0.9 : 0.6,
        color: alert ? "#000000" : "#ffffff", // outline: black ring = ≥ 50% chance
        weight: alert ? 3 : 1.5,
      })
        .bindTooltip(esc(p.name))              // on hover
        .bindPopup(popupHtml(p, linkToDetail)) // on click
        .addTo(layer);
    }

    // Zoom so every sensor fits, once per new map (not on every refresh)
    if (needsFitRef.current && placed.length > 0) {
      map.fitBounds(L.latLngBounds(placed.map((p) => [p.lat, p.lon] as L.LatLngTuple)), {
        padding: [30, 30],
      });
      needsFitRef.current = false;
    }
  }, [pins, linkToDetail]);

  return <div ref={divRef} className="h-full w-full rounded-lg" />;
}

// ---------- Popup contents (Leaflet popups take HTML text) ----------

/** Escape text so a sensor name can never break the HTML. */
function esc(s: string): string {
  const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return s.replace(/[&<>"']/g, (c) => map[c]);
}

function badge(l: LevelInfo): string {
  return `<span class="inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold" style="background:${l.color};color:${l.textColor}">${l.label}</span>`;
}

function popupHtml(p: Pin, linkToDetail: boolean): string {
  const parts: string[] = [
    `<div class="min-w-[190px] space-y-1.5">`,
    `<div class="font-semibold">${esc(p.name)}</div>`,
  ];

  if (!p.inTraining) {
    parts.push(`<span class="inline-block rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-800">New to the model</span>`);
  }

  if (p.level) {
    parts.push(`<div>${badge(levelInfo(p.level))} ${p.mean24h} µg/m³</div>`);
    parts.push(`<div class="text-xs">Next 24 hours · ${pct(p.prob)} chance of unhealthy air</div>`);

    // Demo mode, after "Reveal": what really happened
    if (p.actualLevel !== undefined) {
      parts.push(
        p.actualLevel === null || p.actualMean24h == null
          ? `<div class="text-xs">Really: no data (gaps)</div>`
          : `<div class="text-xs">Really: ${badge(levelInfo(p.actualLevel))} ${p.actualMean24h} µg/m³ ${p.actualLevel === p.level ? "✓" : "✗"}</div>`
      );
    }

    if (linkToDetail) {
      parts.push(`<a data-nav href="/sensor/${encodeURIComponent(p.id)}" class="block text-xs font-medium">See 48-hour forecast →</a>`);
    }
  } else {
    const last = p.lastReading
      ? `<br>Last reading ${ghanaDate(p.lastReading.time)}: ${p.lastReading.pm25} µg/m³`
      : "";
    parts.push(`<div class="text-xs text-zinc-600">No forecast this hour.${last}</div>`);
  }

  parts.push(`</div>`);
  return parts.join("");
}
