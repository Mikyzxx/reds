"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  DoorOpen,
  PhoneCall,
  Plus,
  Trash2,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import type { Group } from "@/lib/types";

export default function CallsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const me = getStoredUser();

  const load = useCallback(() => {
    api<Group[]>("/api/groups")
      .then(setGroups)
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 10_000); // refresca contadores de llamada
    return () => clearInterval(t);
  }, [load]);

  async function createGroup(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api<Group>("/api/groups", {
        method: "POST",
        body: JSON.stringify({ name, description }),
      });
      setName("");
      setDescription("");
      setCreating(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el grupo");
    }
  }

  async function join(g: Group) {
    await api<Group>(`/api/groups/${g.id}/join`, { method: "POST" });
    load();
  }

  async function leave(g: Group) {
    await api<Group>(`/api/groups/${g.id}/leave`, { method: "POST" });
    load();
  }

  async function remove(g: Group) {
    if (!confirm(`¿Borrar el grupo “${g.name}”?`)) return;
    await api(`/api/groups/${g.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex items-center gap-4 border-b border-line px-7 py-5">
        <div>
          <div className="text-xl font-bold">Salas de llamada</div>
          <div className="mt-0.5 font-mono text-[11px] text-fg2">
            {groups
              ? `${groups.length} grupos · voz por WebRTC`
              : "cargando…"}
          </div>
        </div>
        <button
          onClick={() => setCreating((v) => !v)}
          className="ml-auto flex cursor-pointer items-center gap-1.5 bg-cyan px-4 py-[9px] font-mono text-[11px] font-semibold tracking-wide text-[#04121a] hover:bg-cyan-hi"
        >
          <Plus size={13} strokeWidth={2.5} />
          GRUPO
        </button>
      </header>

      {creating && (
        <form
          onSubmit={createGroup}
          className="flex items-end gap-3 border-b border-line bg-panel px-7 py-4"
        >
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="font-mono text-[10px] tracking-[2px] text-fg2">
              NOMBRE
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="p. ej. daily-sync"
              className="border border-line2 bg-field px-3 py-2.5 font-mono text-[13px] text-fg outline-none focus:border-cyan/50"
            />
          </div>
          <div className="flex flex-[2] flex-col gap-1.5">
            <label className="font-mono text-[10px] tracking-[2px] text-fg2">
              DESCRIPCIÓN
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="opcional"
              className="border border-line2 bg-field px-3 py-2.5 font-mono text-[13px] text-fg outline-none focus:border-cyan/50"
            />
          </div>
          <button
            type="submit"
            className="cursor-pointer bg-cyan px-5 py-[10px] font-mono text-[11px] font-semibold tracking-wide text-[#04121a] hover:bg-cyan-hi"
          >
            CREAR
          </button>
        </form>
      )}

      {error && (
        <div className="mx-7 mt-4 border border-red/40 bg-red/10 px-3 py-2 font-mono text-[11px] text-red-hi">
          ✕ {error}
        </div>
      )}

      <div className="grid flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4 overflow-auto p-7">
        {groups?.map((g) => (
          <div
            key={g.id}
            className="flex flex-col gap-3 border border-line2 bg-panel2 p-4 transition hover:border-cyan/40"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{g.name}</span>
              {g.active_call_count > 0 && (
                <span className="flex items-center gap-1.5 border border-red/40 px-2 py-0.5 font-mono text-[9px] tracking-wide text-red-hi">
                  <span className="animate-nexapulse h-1.5 w-1.5 rounded-full bg-red" />
                  EN VIVO · {g.active_call_count}
                </span>
              )}
              {me != null && g.created_by === me.id && (
                <button
                  title="Borrar grupo"
                  onClick={() => remove(g)}
                  className="ml-auto cursor-pointer text-fg3 hover:text-red"
                >
                  <Trash2 size={13} strokeWidth={1.75} />
                </button>
              )}
            </div>
            {g.description && (
              <div className="text-xs leading-relaxed text-fg2">
                {g.description}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              {g.members.slice(0, 6).map((m) => (
                <span
                  key={m.id}
                  title={m.display_name}
                  className="flex h-[22px] w-[22px] items-center justify-center border border-line2 bg-[#131a24] font-mono text-[9px] text-fg2"
                >
                  {m.initials}
                </span>
              ))}
              <span className="ml-1 flex items-center gap-1 font-mono text-[10px] text-fg3">
                <UsersRound size={11} strokeWidth={1.75} />
                {g.members.length} miembros
              </span>
            </div>
            <div className="mt-auto flex gap-2 pt-1">
              {g.is_member ? (
                <>
                  <button
                    onClick={() => router.push(`/app/calls/${g.id}`)}
                    className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 border border-cyan/40 bg-cyan/10 px-3 py-2 font-mono text-[11px] tracking-wide text-cyan hover:bg-cyan/20"
                  >
                    <PhoneCall size={12} strokeWidth={2} />
                    ENTRAR A SALA
                  </button>
                  <button
                    onClick={() => leave(g)}
                    className="flex cursor-pointer items-center gap-1.5 border border-line2 px-3 py-2 font-mono text-[11px] text-fg2 hover:border-red/40 hover:text-red-hi"
                  >
                    <DoorOpen size={12} strokeWidth={2} />
                    SALIR
                  </button>
                </>
              ) : (
                <button
                  onClick={() => join(g)}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 border border-line2 px-3 py-2 font-mono text-[11px] tracking-wide text-fg2 hover:border-cyan/40 hover:text-cyan"
                >
                  <UserRoundPlus size={12} strokeWidth={2} />
                  UNIRME
                </button>
              )}
            </div>
          </div>
        ))}
        {groups?.length === 0 && (
          <div className="col-span-full py-16 text-center font-mono text-xs text-fg3">
            no hay grupos aún — crea el primero con + GRUPO
          </div>
        )}
      </div>
    </div>
  );
}
