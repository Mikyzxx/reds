"use client";

import { GitCommitHorizontal, X } from "lucide-react";
import { useState } from "react";

export default function CommitModal({
  dirtyPaths,
  busy,
  error,
  onCommit,
  onClose,
}: {
  dirtyPaths: string[];
  busy: boolean;
  error: string | null;
  onCommit: (message: string, paths: string[]) => void;
  onClose: () => void;
}) {
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set(dirtyPaths));

  const toggle = (path: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const canCommit = message.trim().length > 0 && selected.size > 0 && !busy;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80">
      <div className="w-[480px] max-w-[90vw] border border-line2 bg-panel">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <GitCommitHorizontal size={14} className="text-cyan" />
          <span className="font-mono text-[11px] tracking-[2px] text-fg">
            COMMIT &amp; PUSH
          </span>
          <button
            onClick={onClose}
            className="ml-auto cursor-pointer text-fg3 hover:text-fg"
          >
            <X size={14} />
          </button>
        </div>

        <div className="max-h-48 overflow-y-auto border-b border-line px-4 py-3">
          {dirtyPaths.map((path) => (
            <label
              key={path}
              className="flex cursor-pointer items-center gap-2 py-1 font-mono text-[11px] text-fg2 hover:text-fg"
            >
              <input
                type="checkbox"
                checked={selected.has(path)}
                onChange={() => toggle(path)}
                className="accent-cyan"
              />
              <span className="truncate">{path}</span>
              <span className="ml-auto text-[9px] text-amber">●</span>
            </label>
          ))}
        </div>

        <div className="px-4 py-3">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Mensaje del commit…"
            rows={3}
            autoFocus
            className="w-full resize-none border border-line2 bg-field px-3 py-2 font-mono text-xs text-fg outline-none placeholder:text-fg3 focus:border-cyan/50"
          />
          {error && (
            <div className="mt-2 border border-red/40 bg-red/10 px-3 py-2 font-mono text-[10px] text-red-hi">
              {error}
            </div>
          )}
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="cursor-pointer border border-line2 px-4 py-2 font-mono text-[10px] tracking-[2px] text-fg2 hover:text-fg"
            >
              CANCELAR
            </button>
            <button
              onClick={() => onCommit(message.trim(), [...selected])}
              disabled={!canCommit}
              className="cursor-pointer border border-cyan/60 bg-cyan/10 px-4 py-2 font-mono text-[10px] tracking-[2px] text-cyan hover:bg-cyan/20 disabled:cursor-default disabled:opacity-40"
            >
              {busy ? "ENVIANDO…" : `COMMIT (${selected.size})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
