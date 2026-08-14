"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { useVoiceCall } from "@/hooks/useVoiceCall";

type VoiceCall = ReturnType<typeof useVoiceCall>;

interface CallContextValue extends VoiceCall {
  /** id del grupo con la llamada activa; null si no hay ninguna en curso */
  activeGroupId: number | null;
  joinCall: (groupId: number) => void;
  leaveCall: () => void;
}

const CallContext = createContext<CallContextValue | null>(null);

/**
 * Mantiene la conexión WebRTC/WebSocket de la llamada montada a nivel de
 * layout (fuera de las páginas de ruta) para que sobreviva la navegación
 * entre secciones de la app. Solo se desconecta al llamar a leaveCall().
 */
export function CallProvider({ children }: { children: React.ReactNode }) {
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);
  const call = useVoiceCall(activeGroupId);

  const joinCall = useCallback((groupId: number) => setActiveGroupId(groupId), []);
  const leaveCall = useCallback(() => setActiveGroupId(null), []);

  return (
    <CallContext.Provider value={{ ...call, activeGroupId, joinCall, leaveCall }}>
      {children}
    </CallContext.Provider>
  );
}

export function useCallSession() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCallSession debe usarse dentro de CallProvider");
  return ctx;
}
