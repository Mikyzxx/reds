"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, X } from "lucide-react";
import type { ShareStatsSnapshot } from "@/hooks/useVoiceCall";

function fmtBitrate(kbps: number): string {
  return kbps >= 1000 ? `${(kbps / 1000).toFixed(2)} Mbps` : `${kbps} kbps`;
}

/** Panel "estadísticas para nerds" sobre la pantalla compartida. */
export default function StatsOverlay({
  sample,
  onClose,
}: {
  sample: () => Promise<ShareStatsSnapshot | null>;
  onClose: () => void;
}) {
  const [stats, setStats] = useState<ShareStatsSnapshot | null>(null);
  const [bitrateKbps, setBitrateKbps] = useState<number | null>(null);
  const prevRef = useRef<ShareStatsSnapshot | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const s = await sample();
      if (!alive) return;
      if (s) {
        const prev = prevRef.current;
        if (prev && s.timestamp > prev.timestamp && s.bytes >= prev.bytes) {
          const kbps = Math.round(
            ((s.bytes - prev.bytes) * 8) / (s.timestamp - prev.timestamp),
          );
          setBitrateKbps(kbps);
        }
        prevRef.current = s;
      }
      setStats(s);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [sample]);

  const rows: [string, string][] = stats
    ? [
        ["DIRECCIÓN", stats.direction === "inbound" ? "↓ bajada" : "↑ subida"],
        [
          "RESOLUCIÓN",
          stats.frameWidth && stats.frameHeight
            ? `${stats.frameWidth}×${stats.frameHeight}${
                stats.fps ? ` @ ${Math.round(stats.fps)}fps` : ""
              }`
            : "—",
        ],
        ["CÓDEC", stats.codec?.replace("video/", "") ?? "—"],
        ["BITRATE", bitrateKbps != null ? fmtBitrate(bitrateKbps) : "midiendo…"],
        [
          "PERDIDOS",
          stats.packetsLost != null ? String(stats.packetsLost) : "—",
        ],
        ["JITTER", stats.jitterMs != null ? `${stats.jitterMs} ms` : "—"],
        ["RTT", stats.rttMs != null ? `${stats.rttMs} ms` : "—"],
      ]
    : [];

  return (
    <div
      className="absolute top-2.5 right-2.5 z-10 w-[230px] border border-cyan/40 bg-bg/90 px-3 py-2.5 font-mono text-[10px] leading-relaxed backdrop-blur-sm"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="mb-1.5 flex items-center gap-1.5 border-b border-line2 pb-1.5 tracking-[2px] text-cyan">
        <Activity size={11} strokeWidth={2} />
        ESTADÍSTICAS
        <button
          onClick={onClose}
          className="ml-auto cursor-pointer text-fg3 hover:text-red"
        >
          <X size={11} strokeWidth={2.5} />
        </button>
      </div>
      {stats ? (
        <dl>
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3">
              <dt className="text-fg3">{k}</dt>
              <dd className="text-fg">{v}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <div className="animate-nexapulse py-1 text-fg3">esperando datos…</div>
      )}
    </div>
  );
}
