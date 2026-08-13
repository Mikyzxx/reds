"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Maximize, Minimize } from "lucide-react";
import type { ShareStatsSnapshot } from "@/hooks/useVoiceCall";
import StatsOverlay from "./StatsOverlay";
import VideoSurface from "./VideoSurface";

/**
 * Layout de "compartiendo pantalla" estilo Google Meet: la captura grande a
 * la izquierda y una columna vertical de participantes a la derecha (16:9,
 * con scroll si son muchos). Clic derecho sobre la captura → estadísticas
 * de conexión; doble clic o botón → pantalla completa.
 */
export default function ShareStage({
  stream,
  ownerLabel,
  sampleStats,
  children,
}: {
  /** stream de la pantalla; null mientras llega el track (placeholder) */
  stream: MediaStream | null;
  ownerLabel: string;
  /** muestreo de getStats() para el overlay; null = sin datos disponibles */
  sampleStats: (() => Promise<ShareStatsSnapshot | null>) | null;
  children: ReactNode;
}) {
  const [showStats, setShowStats] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  // fallback CSS ("modo teatro") si la API de fullscreen está bloqueada
  const [cssFullscreen, setCssFullscreen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const isFull = fullscreen || cssFullscreen;

  // si cambia quién comparte (o se corta), cerrar el overlay
  useEffect(() => {
    if (!sampleStats) setShowStats(false);
  }, [sampleStats]);

  useEffect(() => {
    const onChange = () =>
      setFullscreen(document.fullscreenElement === panelRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    if (!cssFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCssFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cssFullscreen]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      return;
    }
    if (cssFullscreen) {
      setCssFullscreen(false);
      return;
    }
    const el = panelRef.current;
    if (!el) return;
    el.requestFullscreen().catch(() => setCssFullscreen(true));
  }, [cssFullscreen]);

  return (
    <div className="flex min-h-0 flex-1 gap-3">
      <div
        ref={panelRef}
        onDoubleClick={toggleFullscreen}
        onContextMenu={(e) => {
          e.preventDefault();
          if (sampleStats) setShowStats((v) => !v);
        }}
        className={`flex items-center justify-center overflow-hidden border border-cyan/40 bg-panel2 shadow-[0_0_30px_rgba(0,229,255,.08)] ${
          cssFullscreen ? "fixed inset-0 z-50" : "relative min-w-0 flex-1"
        }`}
      >
        {stream ? (
          <VideoSurface stream={stream} contain />
        ) : (
          <div className="text-center">
            <div className="animate-nexapulse font-mono text-xs tracking-[2px] text-cyan">
              [ CONECTANDO PANTALLA ]
            </div>
          </div>
        )}
        <span className="absolute top-2.5 left-2.5 bg-cyan px-2 py-[3px] font-mono text-[10px] font-semibold text-[#04121a]">
          {ownerLabel} · PANTALLA
        </span>
        <button
          onClick={toggleFullscreen}
          title={
            isFull ? "Salir de pantalla completa (Esc)" : "Pantalla completa"
          }
          className="absolute right-2.5 bottom-2.5 z-10 flex cursor-pointer items-center gap-1.5 border border-line2 bg-bg/80 px-2.5 py-1.5 font-mono text-[10px] tracking-wide text-fg2 backdrop-blur-sm hover:border-cyan hover:text-cyan"
        >
          {isFull ? (
            <Minimize size={12} strokeWidth={2} />
          ) : (
            <Maximize size={12} strokeWidth={2} />
          )}
          {isFull ? "SALIR" : "COMPLETA"}
        </button>
        {showStats && sampleStats && (
          <StatsOverlay sample={sampleStats} onClose={() => setShowStats(false)} />
        )}
      </div>
      <div className="flex w-[240px] flex-none flex-col gap-3 overflow-y-auto [&>*]:aspect-video [&>*]:flex-none">
        {children}
      </div>
    </div>
  );
}
