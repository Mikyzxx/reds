"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, KeyRound, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("demo@nexa.dev");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      router.replace("/app/calls");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
      setBusy(false);
    }
  }

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
        {/* corner brackets */}
        <div className="absolute -top-px -left-px h-3.5 w-3.5 border-t-2 border-l-2 border-cyan" />
        <div className="absolute -right-px -bottom-px h-3.5 w-3.5 border-r-2 border-b-2 border-cyan" />

        <div className="mb-1.5 font-mono text-[11px] tracking-[3px] text-cyan">
          {"// NEXA_OS v0.1"}
        </div>
        <div className="mb-0.5 text-3xl font-bold tracking-wide">NEXA</div>
        <div className="mb-8 text-[13px] text-fg2">
          Planner · Llamadas · IDE — para equipos pequeños
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 font-mono text-[10px] tracking-[2px] text-fg2">
              <UserRound size={11} strokeWidth={2} className="text-cyan/60" />
              USUARIO
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full border border-line2 bg-field px-3 py-[11px] font-mono text-[13px] text-fg outline-none focus:border-cyan/50"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 font-mono text-[10px] tracking-[2px] text-fg2">
              <KeyRound size={11} strokeWidth={2} className="text-cyan/60" />
              CONTRASEÑA
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full border border-line2 bg-field px-3 py-[11px] font-mono text-[13px] text-fg outline-none focus:border-cyan/50"
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
            {busy ? "CONECTANDO…" : "ENTRAR COMO DEMO"}
            {!busy && <ArrowRight size={16} strokeWidth={2.5} />}
          </button>
        </div>

        <div className="mt-[22px] text-center font-mono text-[10px] text-fg3">
          sesión demo · ¿sin cuenta?{" "}
          <Link href="/register" className="text-cyan hover:text-cyan-hi">
            → crear una
          </Link>
        </div>
      </form>
    </div>
  );
}
