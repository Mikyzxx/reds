"use client";

import { GitBranch, Lock, Search, Unplug } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ghRepos, type GhRepo } from "@/lib/github";
import Github from "./GithubIcon";

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `hace ${Math.max(mins, 1)} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days} d`;
  return new Date(iso).toLocaleDateString();
}

export default function RepoPicker({
  login,
  avatarUrl,
  onOpen,
  onDisconnect,
}: {
  login: string | null;
  avatarUrl: string | null;
  onOpen: (repo: GhRepo) => void;
  onDisconnect: () => Promise<void>;
}) {
  const [repos, setRepos] = useState<GhRepo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    ghRepos()
      .then(setRepos)
      .catch((e) => setError(e instanceof Error ? e.message : "Error"));
  }, []);

  const visible = useMemo(() => {
    if (!repos) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return repos;
    return repos.filter((r) => r.full_name.toLowerCase().includes(q));
  }, [repos, filter]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-line px-6 py-4">
        <span className="font-mono text-[10px] tracking-[3px] text-cyan">
          MÓDULO 04 · IDE
        </span>
        <span className="text-sm font-bold">Selecciona un repositorio</span>
        <div className="ml-auto flex items-center gap-2.5">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={login ?? "GitHub"}
              className="h-6 w-6 border border-cyan/30"
            />
          ) : (
            <Github size={16} className="text-cyan" />
          )}
          <span className="font-mono text-[11px] text-fg2">@{login}</span>
          <button
            title="Desconectar GitHub"
            onClick={() => void onDisconnect()}
            className="cursor-pointer text-fg3 hover:text-red"
          >
            <Unplug size={14} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="border-b border-line px-6 py-3">
        <div className="flex items-center gap-2 border border-line2 bg-field px-3 py-2">
          <Search size={13} className="text-fg3" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrar repositorios…"
            className="w-full bg-transparent font-mono text-xs text-fg outline-none placeholder:text-fg3"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-3">
        {error && (
          <div className="border border-red/40 bg-red/10 px-3 py-2 font-mono text-[11px] text-red-hi">
            {error}
          </div>
        )}
        {!repos && !error && (
          <div className="animate-nexapulse py-8 text-center font-mono text-[11px] tracking-[2px] text-fg3">
            CARGANDO REPOSITORIOS…
          </div>
        )}
        {repos && visible.length === 0 && (
          <div className="py-8 text-center font-mono text-[11px] text-fg3">
            Sin resultados
          </div>
        )}
        {visible.map((r) => (
          <button
            key={r.full_name}
            onClick={() => onOpen(r)}
            className="flex w-full cursor-pointer items-center gap-3 border-b border-line px-2 py-3 text-left hover:bg-panel2"
          >
            {r.private ? (
              <Lock size={13} className="flex-none text-amber" />
            ) : (
              <Github size={13} className="flex-none text-fg3" />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate font-mono text-xs text-fg">
                {r.full_name}
              </div>
              {r.description && (
                <div className="truncate text-[11px] text-fg3">{r.description}</div>
              )}
            </div>
            <span className="flex flex-none items-center gap-1 font-mono text-[10px] text-fg3">
              <GitBranch size={11} />
              {r.default_branch}
            </span>
            <span className="w-24 flex-none text-right font-mono text-[10px] text-fg3">
              {relativeTime(r.pushed_at)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
