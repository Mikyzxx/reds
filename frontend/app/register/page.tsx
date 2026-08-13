"use client";

import { FormEvent, useState } from "react";
import { AtSign, KeyRound, ShieldCheck, UserRoundPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { register } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setBusy(true);
    try {
      await register(displayName, email, password);
      router.replace("/app/calls");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cuenta");
      setBusy(false);
    }
  }

  const field =
    "w-full border border-line2 bg-field px-3 py-[11px] font-mono text-[13px] text-fg outline-none focus:border-cyan/50";
  const label =
    "flex items-center gap-1.5 font-mono text-[10px] tracking-[2px] text-fg2";
  const iconCls = "text-cyan/60";

  return (
    <div
      className="relative flex h-screen w-screen items-center justify-center overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 60% 50% at 50% 40%,rgba(0,229,255,.06),transparent 70%),#0a0d12",
      }}
    >
      <div className="nexa-grid-bg pointer-events-none absolute inset-0" />

      <form
        onSubmit={onSubmit}
        className="relative w-[380px] border border-cyan/20 bg-panel2 px-10 pt-11 pb-9"
        style={{ boxShadow: "0 0 60px rgba(0,229,255,.07)" }}
      >
        <div className="absolute -top-px -left-px h-3.5 w-3.5 border-t-2 border-l-2 border-cyan" />
        <div className="absolute -right-px -bottom-px h-3.5 w-3.5 border-r-2 border-b-2 border-cyan" />

        <div className="mb-1.5 font-mono text-[11px] tracking-[3px] text-cyan">
          {"// NEXA_OS v0.1"}
        </div>
        <div className="mb-0.5 text-3xl font-bold tracking-wide">CREAR CUENTA</div>
        <div className="mb-8 text-[13px] text-fg2">
          Únete a tu equipo en NEXA
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label className={label}>
              <UserRoundPlus size={11} strokeWidth={2} className={iconCls} />
              NOMBRE
            </label>
            <input
              autoFocus
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="p. ej. Kevin Torres"
              autoComplete="name"
              required
              className={field}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={label}>
              <AtSign size={11} strokeWidth={2} className={iconCls} />
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@equipo.dev"
              autoComplete="email"
              required
              className={field}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={label}>
              <KeyRound size={11} strokeWidth={2} className={iconCls} />
              CONTRASEÑA
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="mínimo 8 caracteres"
              autoComplete="new-password"
              required
              className={field}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={label}>
              <ShieldCheck size={11} strokeWidth={2} className={iconCls} />
              CONFIRMAR CONTRASEÑA
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
              className={field}
            />
          </div>

          {error && (
            <div className="border border-red/40 bg-red/10 px-3 py-2 font-mono text-[11px] text-red-hi">
              ✕ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-2.5 flex cursor-pointer items-center justify-center gap-2 bg-cyan p-[13px] text-sm font-semibold tracking-wide text-[#04121a] transition hover:bg-cyan-hi hover:shadow-[0_0_24px_rgba(0,229,255,.4)] disabled:opacity-60"
          >
            {busy ? "CREANDO…" : "CREAR CUENTA"}
            {!busy && <UserRoundPlus size={16} strokeWidth={2.5} />}
          </button>
        </div>

        <div className="mt-[22px] text-center font-mono text-[10px] text-fg3">
          ¿ya tienes cuenta?{" "}
          <Link href="/login" className="text-cyan hover:text-cyan-hi">
            → iniciar sesión
          </Link>
        </div>
      </form>
    </div>
  );
}
