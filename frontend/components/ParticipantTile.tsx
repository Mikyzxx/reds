import { MicOff } from "lucide-react";
import VideoSurface from "./VideoSurface";

export default function ParticipantTile({
  initials,
  name,
  label,
  speaking,
  muted,
  stream = null,
  mirror = false,
  compact = false,
}: {
  initials: string;
  name: string;
  label?: string;
  speaking: boolean;
  muted: boolean;
  /** stream de cámara; si es null se muestra el avatar de iniciales */
  stream?: MediaStream | null;
  mirror?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden border bg-panel2 ${
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
    </div>
  );
}
