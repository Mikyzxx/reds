"use client";

import { Mic, MicOff, PhoneOff } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallSession } from "@/contexts/CallContext";

/** Pastilla flotante para volver a / colgar la llamada activa mientras se
 * navega por otra sección; se oculta en la propia sala de llamada. */
export default function ActiveCallBar() {
  const pathname = usePathname();
  const { activeGroupId, status, peers, micOn, toggleMic, leaveCall } =
    useCallSession();

  if (activeGroupId == null) return null;
  if (pathname === `/app/calls/${activeGroupId}`) return null;

  const total = peers.length + 1;

  return (
    <div className="fixed right-6 bottom-6 z-50 flex items-center gap-3 border border-cyan/40 bg-panel2 px-4 py-2.5 shadow-[0_0_24px_rgba(0,229,255,.15)]">
      <span
        className={`h-2 w-2 rounded-full ${
          status === "connected"
            ? "animate-nexapulse bg-red [animation-duration:1.6s]"
            : "bg-fg3"
        }`}
      />
      <span className="font-mono text-[11px] text-fg2">
        EN LLAMADA · {total} participante{total === 1 ? "" : "s"}
      </span>
      <button
        onClick={toggleMic}
        title={micOn ? "Silenciar" : "Activar micrófono"}
        className={`cursor-pointer ${micOn ? "text-cyan" : "text-red-hi"}`}
      >
        {micOn ? (
          <Mic size={14} strokeWidth={2} />
        ) : (
          <MicOff size={14} strokeWidth={2} />
        )}
      </button>
      <Link
        href={`/app/calls/${activeGroupId}`}
        className="cursor-pointer border border-line2 px-2.5 py-1 font-mono text-[10px] tracking-wide text-fg2 hover:border-cyan hover:text-cyan"
      >
        VOLVER
      </Link>
      <button
        onClick={leaveCall}
        title="Salir de la llamada"
        className="cursor-pointer text-fg3 hover:text-red"
      >
        <PhoneOff size={14} strokeWidth={2} />
      </button>
    </div>
  );
}
