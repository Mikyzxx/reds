"use client";

import {
  ArrowLeft,
  GitBranch,
  GitCommitHorizontal,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import {
  ghBranches,
  ghCommit,
  ghFile,
  ghPull,
  ghTree,
  type GhBranch,
  type GhRepo,
  type GhTreeEntry,
} from "@/lib/github";
import CodeEditor from "./CodeEditor";
import CommitModal from "./CommitModal";
import EditorTabs from "./EditorTabs";
import FileTree from "./FileTree";
import PullConflictModal, { type PullConflict } from "./PullConflictModal";

interface OpenFile {
  original: string;
  current: string;
  isBinary: boolean;
  isImage: boolean;
  tooLarge: boolean;
  size: number;
}

const isDirty = (f: OpenFile) =>
  !f.isBinary && !f.tooLarge && f.current !== f.original;

export default function IdeWorkspace({
  repo,
  branch,
  onBranchChange,
  onExit,
  onAuthLost,
}: {
  repo: GhRepo;
  branch: string;
  onBranchChange: (branch: string) => void;
  onExit: () => void;
  onAuthLost: () => void;
}) {
  const [headSha, setHeadSha] = useState<string | null>(null);
  const [entries, setEntries] = useState<GhTreeEntry[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [branches, setBranches] = useState<GhBranch[]>([]);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [loadingTree, setLoadingTree] = useState(true);

  const [openFiles, setOpenFiles] = useState<Record<string, OpenFile>>({});
  const [tabOrder, setTabOrder] = useState<string[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);

  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [commitOpen, setCommitOpen] = useState(false);
  const [commitBusy, setCommitBusy] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [pullBusy, setPullBusy] = useState(false);
  const [conflicts, setConflicts] = useState<PullConflict[] | null>(null);

  const dirtyPaths = useMemo(
    () =>
      new Set(
        Object.entries(openFiles)
          .filter(([, f]) => isDirty(f))
          .map(([path]) => path),
      ),
    [openFiles],
  );

  const openFilesRef = useRef(openFiles);
  openFilesRef.current = openFiles;
  const headShaRef = useRef(headSha);
  headShaRef.current = headSha;

  const handleError = useCallback(
    (e: unknown, fallback: string) => {
      if (e instanceof ApiError && e.status === 401) {
        onAuthLost();
        return;
      }
      setStatusMsg(e instanceof Error ? e.message : fallback);
    },
    [onAuthLost],
  );

  // Carga inicial + al cambiar de branch: árbol nuevo, pestañas fuera
  useEffect(() => {
    let cancelled = false;
    setLoadingTree(true);
    setTreeError(null);
    setOpenFiles({});
    setTabOrder([]);
    setActivePath(null);
    ghTree(repo.owner, repo.name, branch)
      .then((t) => {
        if (cancelled) return;
        setHeadSha(t.head_sha);
        setEntries(t.entries);
        setTruncated(t.truncated);
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) onAuthLost();
        else if (e instanceof ApiError && e.status === 404)
          setTreeError("Repo vacío o branch inexistente");
        else setTreeError(e instanceof Error ? e.message : "Error al cargar el árbol");
      })
      .finally(() => !cancelled && setLoadingTree(false));
    return () => {
      cancelled = true;
    };
  }, [repo.owner, repo.name, branch, onAuthLost]);

  useEffect(() => {
    ghBranches(repo.owner, repo.name)
      .then(setBranches)
      .catch(() => setBranches([]));
  }, [repo.owner, repo.name]);

  // Aviso del navegador si hay cambios sin commitear
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyPaths.size > 0) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirtyPaths]);

  const openFile = useCallback(
    async (path: string) => {
      if (openFilesRef.current[path]) {
        setActivePath(path);
        return;
      }
      const sha = headShaRef.current;
      if (!sha) return;
      try {
        const f = await ghFile(repo.owner, repo.name, path, sha);
        const content = f.content ?? "";
        setOpenFiles((prev) => ({
          ...prev,
          [path]: {
            original: content,
            current: content,
            isBinary: f.is_binary,
            isImage: f.is_image,
            tooLarge: f.too_large,
            size: f.size,
          },
        }));
        setTabOrder((prev) => (prev.includes(path) ? prev : [...prev, path]));
        setActivePath(path);
      } catch (e) {
        handleError(e, `No se pudo abrir ${path}`);
      }
    },
    [repo.owner, repo.name, handleError],
  );

  const closeFile = useCallback((path: string) => {
    const file = openFilesRef.current[path];
    if (file && isDirty(file) && !confirm(`${path} tiene cambios sin commitear. ¿Cerrar igualmente?`)) {
      return;
    }
    setOpenFiles((prev) => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
    setTabOrder((prev) => {
      const next = prev.filter((p) => p !== path);
      setActivePath((active) =>
        active === path ? (next[next.length - 1] ?? null) : active,
      );
      return next;
    });
  }, []);

  const onEdit = useCallback((path: string, value: string) => {
    setOpenFiles((prev) =>
      prev[path] ? { ...prev, [path]: { ...prev[path], current: value } } : prev,
    );
  }, []);

  const doCommit = useCallback(
    async (message: string, paths: string[]) => {
      if (!headShaRef.current) return;
      setCommitBusy(true);
      setCommitError(null);
      try {
        const result = await ghCommit(repo.owner, repo.name, {
          branch,
          expected_head_sha: headShaRef.current,
          message,
          files: paths.map((p) => ({
            path: p,
            content: openFilesRef.current[p].current,
          })),
        });
        setHeadSha(result.new_head_sha);
        setOpenFiles((prev) => {
          const next = { ...prev };
          for (const p of paths) {
            if (next[p]) next[p] = { ...next[p], original: next[p].current };
          }
          return next;
        });
        setCommitOpen(false);
        setStatusMsg(`✓ pushed ${result.new_head_sha.slice(0, 7)}`);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          onAuthLost();
        } else if (e instanceof ApiError && e.status === 409) {
          setCommitError("El remoto avanzó — haz PULL antes de commitear");
        } else {
          setCommitError(e instanceof Error ? e.message : "Error al commitear");
        }
      } finally {
        setCommitBusy(false);
      }
    },
    [repo.owner, repo.name, branch, onAuthLost],
  );

  /** Refresca árbol + archivos abiertos hasta el head remoto actual. */
  const applyRemoteChanges = useCallback(
    async (changedPaths: Set<string> | null, removedPaths: Set<string>) => {
      const t = await ghTree(repo.owner, repo.name, branch);
      const open = openFilesRef.current;
      const newConflicts: PullConflict[] = [];
      const updates: Record<string, OpenFile> = {};

      for (const [path, file] of Object.entries(open)) {
        if (removedPaths.has(path)) continue; // se cierra abajo si está limpio
        const touched = changedPaths === null || changedPaths.has(path);
        if (!touched) continue;
        try {
          const remote = await ghFile(repo.owner, repo.name, path, t.head_sha);
          const remoteContent = remote.content ?? "";
          if (isDirty(file)) {
            if (remoteContent !== file.original) {
              newConflicts.push({
                path,
                remoteContent,
                localContent: file.current,
              });
            }
          } else {
            updates[path] = {
              original: remoteContent,
              current: remoteContent,
              isBinary: remote.is_binary,
              isImage: remote.is_image,
              tooLarge: remote.too_large,
              size: remote.size,
            };
          }
        } catch {
          /* el archivo puede haber desaparecido en el remoto */
        }
      }

      setOpenFiles((prev) => {
        const next = { ...prev, ...updates };
        for (const path of removedPaths) {
          if (next[path] && !isDirty(next[path])) delete next[path];
        }
        return next;
      });
      setTabOrder((prev) => {
        const next = prev.filter((p) => {
          const f = openFilesRef.current[p];
          return !removedPaths.has(p) || (f && isDirty(f));
        });
        setActivePath((active) =>
          active && !next.includes(active) ? (next[next.length - 1] ?? null) : active,
        );
        return next;
      });
      setHeadSha(t.head_sha);
      setEntries(t.entries);
      setTruncated(t.truncated);
      if (newConflicts.length > 0) setConflicts(newConflicts);
      return newConflicts.length;
    },
    [repo.owner, repo.name, branch],
  );

  const doPull = useCallback(async () => {
    if (!headShaRef.current || pullBusy) return;
    setPullBusy(true);
    setStatusMsg(null);
    try {
      const res = await ghPull(repo.owner, repo.name, branch, headShaRef.current);
      if (res.up_to_date) {
        setStatusMsg("✓ ya estás al día");
        return;
      }
      if (res.full_refresh) {
        if (
          !confirm(
            "El historial remoto fue reescrito (force push). Se recargará todo el árbol.",
          )
        )
          return;
        const n = await applyRemoteChanges(null, new Set());
        setStatusMsg(n ? `${n} conflicto(s) por resolver` : "✓ árbol recargado");
        return;
      }
      const changed = new Set(
        res.files
          .filter((f) => f.status !== "removed")
          .map((f) => f.filename),
      );
      const removed = new Set(
        res.files.filter((f) => f.status === "removed").map((f) => f.filename),
      );
      const n = await applyRemoteChanges(changed, removed);
      setStatusMsg(
        n
          ? `${n} conflicto(s) por resolver`
          : `✓ pull: ${res.files.length} archivo(s) actualizados`,
      );
    } catch (e) {
      handleError(e, "Error al hacer pull");
    } finally {
      setPullBusy(false);
    }
  }, [repo.owner, repo.name, branch, pullBusy, applyRemoteChanges, handleError]);

  const resolveConflict = useCallback(
    (path: string, decision: "mine" | "remote") => {
      setConflicts((prev) => {
        const conflict = prev?.find((c) => c.path === path);
        if (conflict) {
          setOpenFiles((files) =>
            files[path]
              ? {
                  ...files,
                  [path]:
                    decision === "mine"
                      ? // base nueva = remoto; la edición local sigue pendiente
                        { ...files[path], original: conflict.remoteContent }
                      : {
                          ...files[path],
                          original: conflict.remoteContent,
                          current: conflict.remoteContent,
                        },
                }
              : files,
          );
        }
        const rest = prev?.filter((c) => c.path !== path) ?? [];
        return rest.length > 0 ? rest : null;
      });
    },
    [],
  );

  const switchBranch = (next: string) => {
    if (next === branch) return;
    if (
      dirtyPaths.size > 0 &&
      !confirm("Tienes cambios sin commitear; se perderán al cambiar de branch. ¿Continuar?")
    )
      return;
    onBranchChange(next);
  };

  const exit = () => {
    if (
      dirtyPaths.size > 0 &&
      !confirm("Tienes cambios sin commitear; se perderán al salir. ¿Continuar?")
    )
      return;
    onExit();
  };

  const activeFile = activePath ? openFiles[activePath] : null;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* barra de acciones */}
      <div className="flex flex-none items-center gap-3 border-b border-line bg-panel px-4 py-2">
        <button
          onClick={exit}
          title="Cambiar de repositorio"
          className="cursor-pointer text-fg3 hover:text-fg"
        >
          <ArrowLeft size={15} />
        </button>
        <span className="font-mono text-xs text-fg">{repo.full_name}</span>
        <span className="flex items-center gap-1 font-mono text-[11px] text-fg2">
          <GitBranch size={12} className="text-cyan/70" />
          <select
            value={branch}
            onChange={(e) => switchBranch(e.target.value)}
            className="cursor-pointer bg-panel font-mono text-[11px] text-fg2 outline-none"
          >
            {(branches.length > 0 ? branches : [{ name: branch, sha: "" }]).map(
              (b) => (
                <option key={b.name} value={b.name}>
                  {b.name}
                </option>
              ),
            )}
          </select>
        </span>

        {statusMsg && (
          <span className="truncate font-mono text-[10px] text-fg2">{statusMsg}</span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => void doPull()}
            disabled={pullBusy || loadingTree}
            className="flex cursor-pointer items-center gap-1.5 border border-line2 px-3 py-1.5 font-mono text-[10px] tracking-[2px] text-fg2 hover:text-fg disabled:opacity-40"
          >
            <RefreshCw size={11} className={pullBusy ? "animate-spin" : ""} />
            PULL
          </button>
          <button
            onClick={() => {
              setCommitError(null);
              setCommitOpen(true);
            }}
            disabled={dirtyPaths.size === 0}
            className="flex cursor-pointer items-center gap-1.5 border border-cyan/60 bg-cyan/10 px-3 py-1.5 font-mono text-[10px] tracking-[2px] text-cyan hover:bg-cyan/20 disabled:cursor-default disabled:border-line2 disabled:bg-transparent disabled:text-fg3"
          >
            <GitCommitHorizontal size={12} />
            COMMIT{dirtyPaths.size > 0 && ` (${dirtyPaths.size})`}
          </button>
        </div>
      </div>

      {/* cuerpo: árbol + editor */}
      <div className="flex min-h-0 flex-1">
        <aside className="w-[260px] flex-none overflow-hidden border-r border-line bg-panel">
          {loadingTree ? (
            <div className="animate-nexapulse p-4 font-mono text-[10px] tracking-[2px] text-fg3">
              CARGANDO ÁRBOL…
            </div>
          ) : treeError ? (
            <div className="p-4 font-mono text-[10px] text-red-hi">{treeError}</div>
          ) : (
            <FileTree
              entries={entries}
              dirtyPaths={dirtyPaths}
              activePath={activePath}
              onOpenFile={(p) => void openFile(p)}
            />
          )}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <EditorTabs
            paths={tabOrder}
            activePath={activePath}
            dirtyPaths={dirtyPaths}
            onSelect={setActivePath}
            onClose={closeFile}
          />
          <div className="min-h-0 flex-1">
            {activePath && activeFile ? (
              <CodeEditor
                path={activePath}
                content={activeFile.current}
                notEditable={
                  activeFile.isImage && activeFile.current
                    ? "image"
                    : activeFile.isBinary
                      ? "binary"
                      : activeFile.tooLarge
                        ? "too_large"
                        : null
                }
                imageSize={activeFile.size}
                onChange={(v) => onEdit(activePath, v)}
                onSave={() => {
                  if (dirtyPaths.size > 0) {
                    setCommitError(null);
                    setCommitOpen(true);
                  }
                }}
              />
            ) : (
              <div className="flex h-full items-center justify-center font-mono text-[11px] tracking-[2px] text-fg3">
                SELECCIONA UN ARCHIVO DEL ÁRBOL
              </div>
            )}
          </div>
        </div>
      </div>

      {/* barra de estado */}
      <div className="flex flex-none items-center gap-4 border-t border-line bg-panel px-4 py-1.5 font-mono text-[10px] text-fg3">
        <span className="text-cyan/70">{headSha ? headSha.slice(0, 7) : "———"}</span>
        {activePath && <span className="truncate">{activePath}</span>}
        {truncated && (
          <span className="text-amber">árbol truncado (repo muy grande)</span>
        )}
        <span className="ml-auto">
          {dirtyPaths.size > 0 ? (
            <span className="text-amber">● {dirtyPaths.size} sin commitear</span>
          ) : (
            <span className="text-green">✓ sincronizado</span>
          )}
        </span>
      </div>

      {commitOpen && (
        <CommitModal
          dirtyPaths={[...dirtyPaths]}
          busy={commitBusy}
          error={commitError}
          onCommit={(msg, paths) => void doCommit(msg, paths)}
          onClose={() => setCommitOpen(false)}
        />
      )}
      {conflicts && (
        <PullConflictModal conflicts={conflicts} onResolve={resolveConflict} />
      )}
    </div>
  );
}
