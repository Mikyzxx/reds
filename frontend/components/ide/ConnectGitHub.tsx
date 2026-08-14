"use client";

import { useState } from "react";
import { ghConnectUrl } from "@/lib/github";
import Github from "./GithubIcon";

export default function ConnectGitHub({ error }: { error: string | null }) {
  const [busy, setBusy] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const connect = async () => {
    setBusy(true);
    setConnectError(null);
    try {
      const { authorize_url } = await ghConnectUrl();
      window.location.href = authorize_url;
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : "Error al conectar");
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center">
      <div className="relative border border-line2 bg-panel2 px-14 py-12 text-center">
        <div className="absolute -top-px -left-px h-3.5 w-3.5 border-t-2 border-l-2 border-cyan" />
        <div className="absolute -right-px -bottom-px h-3.5 w-3.5 border-r-2 border-b-2 border-cyan" />
        <div className="mb-4 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center border border-cyan/30 bg-cyan/10 text-cyan">
            <Github size={26} />
          </div>
        </div>
        <div className="mb-2 font-mono text-[10px] tracking-[3px] text-cyan">
          MÓDULO 04 · IDE
        </div>
        <div className="mb-3 text-2xl font-bold">Conectar GitHub</div>
        <div className="mb-6 max-w-[360px] text-[13px] leading-relaxed text-fg2">
          Autoriza tu cuenta de GitHub para explorar tus repositorios, editar
          código y enviar commits sin salir de NEXA.
        </div>

        {(error || connectError) && (
          <div className="mb-4 border border-red/40 bg-red/10 px-3 py-2 font-mono text-[10px] tracking-wide text-red-hi">
            ERROR: {connectError ?? `la conexión falló (${error})`}
          </div>
        )}

        <button
          onClick={connect}
          disabled={busy}
          className="inline-flex cursor-pointer items-center gap-2.5 border border-cyan/60 bg-cyan/10 px-6 py-2.5 font-mono text-[11px] tracking-[2px] text-cyan hover:bg-cyan/20 disabled:opacity-50"
        >
          <Github size={14} />
          {busy ? "REDIRIGIENDO…" : "CONECTAR CUENTA"}
        </button>
      </div>
    </div>
  );
}
