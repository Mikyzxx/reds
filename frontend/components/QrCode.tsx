"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

/** QR generado en el navegador: la dirección nunca sale hacia un servicio de
 * terceros y la sección funciona sin conexión. */
export default function QrCode({
  value,
  size = 148,
}: {
  value: string;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    QRCode.toCanvas(canvas, value, {
      width: size,
      margin: 1,
      // colores del tema (globals.css): --color-fg sobre --color-panel2
      color: { dark: "#e2ebf2ff", light: "#0e131bff" },
    }).catch(() => {
      if (!cancelled) setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (failed) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center border border-line2 font-mono text-[10px] tracking-[2px] text-fg3"
      >
        SIN QR
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="h-auto max-w-full border border-line2"
    />
  );
}
