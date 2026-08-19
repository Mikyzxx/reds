"use client";

import { useState } from "react";
import { AlertTriangle, BadgeCheck, HandCoins, Wallet } from "lucide-react";
import CopyField from "@/components/CopyField";
import QrCode from "@/components/QrCode";
import {
  BINANCE_NICKNAME,
  BINANCE_PAY_ID,
  BINANCE_PAY_QR,
  WALLETS,
} from "@/lib/donations";

export default function DonacionesPage() {
  // El QR de Binance Pay es un PNG opcional que se exporta desde la app de
  // Binance; si no está en /public se oculta en vez de dejar el hueco roto.
  const [payQrOk, setPayQrOk] = useState(true);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex items-center gap-3 border-b border-line px-4 py-4 sm:gap-4 sm:px-7 sm:py-5">
        <div className="min-w-0">
          <div className="text-lg font-bold sm:text-xl">Donaciones</div>
          <div className="mt-0.5 truncate font-mono text-[10px] text-fg2 sm:text-[11px]">
            apoya el desarrollo de NEXA con Binance
          </div>
        </div>
        <HandCoins
          size={20}
          strokeWidth={1.75}
          className="ml-auto flex-none text-cyan/70"
        />
      </header>

      <div className="flex-1 overflow-auto p-4 sm:p-7">
        <div className="mb-4 flex items-start gap-2.5 border border-amber/40 bg-amber/10 px-3 py-2.5 font-mono text-[10px] leading-relaxed text-amber sm:mb-5 sm:text-[11px]">
          <AlertTriangle size={13} strokeWidth={2} className="mt-px flex-none" />
          <span>
            Envía únicamente el activo indicado por la red indicada. Usar otra
            red, o enviar otro token a estas direcciones, provoca la pérdida
            irreversible de los fondos.
          </span>
        </div>

        <div className="grid auto-rows-min grid-cols-1 gap-4 md:grid-cols-[repeat(auto-fill,minmax(320px,1fr))]">
          {/* Binance Pay: transferencia interna, sin comisión de red */}
          <div className="flex flex-col gap-4 border border-line2 bg-panel2 p-4 sm:p-6">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="h-1.5 w-1.5 flex-none bg-cyan" />
              <span className="font-mono text-[10px] tracking-[2px] text-cyan">
                BINANCE PAY
              </span>
              <span className="ml-auto font-mono text-[10px] tracking-[1px] text-fg3">
                SIN COMISIÓN
              </span>
            </div>

            <p className="text-[13px] leading-relaxed text-fg2">
              La vía más directa: en la app de Binance entra en{" "}
              <span className="text-fg">Pay → Enviar</span> y busca este ID. La
              transferencia es interna entre cuentas de Binance, instantánea y
              sin comisión de red.
            </p>

            <div className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] tracking-[2px] text-fg3">
                PAY ID
              </span>
              <CopyField value={BINANCE_PAY_ID} label="el Pay ID" />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-fg2">
              <BadgeCheck size={12} strokeWidth={2} className="text-cyan/70" />
              verifica que el nickname sea
              <span className="text-fg">{BINANCE_NICKNAME}</span>
            </div>

            {payQrOk && (
              <img
                src={BINANCE_PAY_QR}
                alt="QR de cobro de Binance Pay"
                width={148}
                height={148}
                onError={() => setPayQrOk(false)}
                className="h-auto max-w-full self-center border border-line2 bg-field"
              />
            )}
          </div>

          {/* Depósito on-chain: una tarjeta por red aceptada */}
          {WALLETS.map((w) => (
            <div
              key={w.id}
              className="flex flex-col gap-4 border border-line2 bg-panel2 p-4 sm:p-6"
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className={`h-1.5 w-1.5 flex-none ${w.dot}`} />
                <span
                  className={`font-mono text-[10px] tracking-[2px] ${w.text}`}
                >
                  {w.asset}
                </span>
                <span className="ml-auto font-mono text-[10px] tracking-[1px] text-fg3">
                  {w.network}
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-[10px] tracking-[2px] text-fg3">
                  DIRECCIÓN
                </span>
                <CopyField value={w.address} label={`la dirección ${w.asset}`} />
              </div>

              <div className="flex justify-center py-1">
                <QrCode value={w.address} />
              </div>

              <div className="flex items-center gap-1.5 font-mono text-[11px] text-fg2">
                <Wallet size={12} strokeWidth={2} className="flex-none text-fg3" />
                escanea desde Binance → Retirar
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 max-w-[560px] text-[13px] leading-relaxed text-fg2">
          Gracias por sostener el proyecto. Cada aporte se destina a servidores,
          dominios y al tiempo de desarrollo de los módulos que vienen.
        </p>
      </div>
    </div>
  );
}
