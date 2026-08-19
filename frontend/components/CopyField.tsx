"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

/** Valor de solo lectura con botón de copiar. El texto se muestra completo en
 * el title porque una dirección larga se trunca en el ancho de la tarjeta. */
export default function CopyField({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function copy() {
    try {
      // clipboard API solo existe en contexto seguro (https/localhost); por
      // http plano (ngrok viejo, IP de LAN) se cae al método antiguo.
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      /* el usuario siempre puede seleccionar el texto a mano */
    }
  }

  return (
    <div className="flex min-w-0">
      <span
        title={value}
        className="min-w-0 flex-1 truncate border border-line2 border-r-0 bg-field px-2.5 py-2 font-mono text-[12px] text-fg"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={copy}
        title={`Copiar ${label}`}
        aria-label={`Copiar ${label}`}
        className={`flex flex-none cursor-pointer items-center justify-center border px-2.5 transition ${
          copied
            ? "border-green/50 bg-green/10 text-green"
            : "border-line2 bg-panel text-fg2 hover:border-cyan/50 hover:text-cyan"
        }`}
      >
        {copied ? (
          <Check size={14} strokeWidth={2} />
        ) : (
          <Copy size={14} strokeWidth={2} />
        )}
      </button>
    </div>
  );
}
