"use client";

import { useRef, useState } from "react";
import { MicOff, Volume1, Volume2, VolumeX } from "lucide-react";
import VideoSurface from "./VideoSurface";
import { assetUrl } from "@/lib/api";

export default function ParticipantTile({
  initials,
  name,
  label,
  speaking,
  muted,
  stream = null,
  avatarUrl = null,
  mirror = false,
  compact = false,
  volume = null,
  onVolumeChange,
}: {
  initials: string;
  name: string;
  label?: string;
  speaking: boolean;
  muted: boolean;
  /** stream de cámara; si es null se muestra el avatar (foto o iniciales) */
  stream?: MediaStream | null;
  /** foto de perfil; si es null (o falla al cargar) se muestran las iniciales */
  avatarUrl?: string | null;
  mirror?: boolean;
  compact?: boolean;
  /** volumen local 0..1 de la voz de este peer; null oculta el control */
  volume?: number | null;
  onVolumeChange?: (v: number) => void;
}) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  // último volumen distinto de cero, para restaurar al des-silenciar
  const lastVolRef = useRef(1);
  if (volume != null && volume > 0) lastVolRef.current = volume;
  const VolIcon =
    volume === 0 ? VolumeX : volume != null && volume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      className={`group relative flex items-center justify-center overflow-hidden border bg-panel2 ${
        speaking
          ? "border-cyan/60 shadow-[0_0_24px_rgba(0,229,255,.12)]"
          : "border-line2"
      }`}
      style={{
        backgroundImage:
          "radial-gradient(circle at 50% 40%,rgba(0,229,255,.05),transparent 60%)",
      }}
    >
      {stream ? (
        <VideoSurface stream={stream} mirror={mirror} />
      ) : avatarUrl && !avatarFailed ? (
        <img
          src={assetUrl(avatarUrl)}
          alt={name}
          onError={() => setAvatarFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          className={`flex items-center justify-center border border-cyan/30 bg-cyan/10 font-mono text-cyan ${
            compact ? "h-10 w-10 text-xs" : "h-16 w-16 text-lg"
          }`}
        >
          {initials}
        </div>
      )}

      <span
        className={`absolute bottom-2.5 left-3 font-mono text-[10px] ${
          speaking ? "text-cyan" : "text-fg2"
        } ${stream ? "bg-bg/70 px-1.5 py-0.5" : ""}`}
      >
        {name}
        {speaking ? " · hablando" : ""}
        {muted ? " · mic off" : ""}
        {label ? ` ${label}` : ""}
      </span>

      {muted && (
        <span className="absolute top-2.5 right-3 flex items-center gap-1 border border-red/40 bg-bg/70 px-1.5 py-0.5 font-mono text-[9px] text-red-hi">
          <MicOff size={10} strokeWidth={2} />
          MIC
        </span>
      )}

      {speaking && !muted && (
        <span className="absolute top-2.5 right-3 flex h-3.5 items-end gap-[3px]">
          <span className="animate-nexapulse h-1.5 w-[3px] bg-cyan [animation-duration:1s]" />
          <span className="animate-nexapulse h-3 w-[3px] bg-cyan [animation-duration:.7s]" />
          <span className="animate-nexapulse h-[9px] w-[3px] bg-cyan [animation-duration:1.3s]" />
        </span>
      )}

      {volume != null && onVolumeChange && (
        <div
          className={`absolute right-2 bottom-2 z-10 flex items-center gap-1.5 border border-line2 bg-bg/80 px-1.5 py-1 backdrop-blur-sm transition-opacity ${
            volume === 0 ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <button
            onClick={() => onVolumeChange(volume === 0 ? lastVolRef.current : 0)}
            title={
              volume === 0
                ? "Quitar silencio (solo para ti)"
                : "Silenciar (solo para ti)"
            }
            className={`cursor-pointer ${
              volume === 0 ? "text-red-hi" : "text-cyan"
            }`}
          >
            <VolIcon size={12} strokeWidth={2} />
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(volume * 100)}
            onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
            title="Volumen de esta persona (solo para ti)"
            className="h-1 w-14 cursor-pointer accent-cyan"
          />
        </div>
      )}
    </div>
  );
}
