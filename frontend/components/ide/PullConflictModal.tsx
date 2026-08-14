"use client";

import { DiffEditor } from "@monaco-editor/react";
import { GitPullRequestArrow } from "lucide-react";
import { useState } from "react";
import { configureMonaco, EDITOR_OPTIONS, NEXA_THEME } from "./CodeEditor";

export interface PullConflict {
  path: string;
  remoteContent: string;
  localContent: string;
}

export default function PullConflictModal({
  conflicts,
  onResolve,
}: {
  conflicts: PullConflict[];
  /** decision: "mine" conserva la edición local sobre la base nueva; "remote" la descarta */
  onResolve: (path: string, decision: "mine" | "remote") => void;
}) {
  const [index, setIndex] = useState(0);
  const conflict = conflicts[index];
  if (!conflict) return null;

  const decide = (decision: "mine" | "remote") => {
    onResolve(conflict.path, decision);
    setIndex((i) => i + 1); // el padre desmonta el modal al resolver el último
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80">
      <div className="flex h-[80vh] w-[85vw] flex-col border border-line2 bg-panel">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <GitPullRequestArrow size={14} className="text-amber" />
          <span className="font-mono text-[11px] tracking-[2px] text-fg">
            CONFLICTO {index + 1}/{conflicts.length}
          </span>
          <span className="truncate font-mono text-[11px] text-fg2">
            {conflict.path}
          </span>
          <span className="ml-auto font-mono text-[10px] text-fg3">
            ← REMOTO · LOCAL →
          </span>
        </div>

        <div className="min-h-0 flex-1">
          <DiffEditor
            original={conflict.remoteContent}
            modified={conflict.localContent}
            theme={NEXA_THEME}
            beforeMount={configureMonaco}
            options={{ ...EDITOR_OPTIONS, readOnly: true, renderSideBySide: true }}
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-4 py-3">
          <button
            onClick={() => decide("remote")}
            className="cursor-pointer border border-line2 px-4 py-2 font-mono text-[10px] tracking-[2px] text-fg2 hover:text-fg"
          >
            TOMAR REMOTO (descarta lo mío)
          </button>
          <button
            onClick={() => decide("mine")}
            className="cursor-pointer border border-cyan/60 bg-cyan/10 px-4 py-2 font-mono text-[10px] tracking-[2px] text-cyan hover:bg-cyan/20"
          >
            MANTENER LO MÍO
          </button>
        </div>
      </div>
    </div>
  );
}
