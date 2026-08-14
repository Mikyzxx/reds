"use client";

import { X } from "lucide-react";

export default function EditorTabs({
  paths,
  activePath,
  dirtyPaths,
  onSelect,
  onClose,
}: {
  paths: string[];
  activePath: string | null;
  dirtyPaths: Set<string>;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
}) {
  if (paths.length === 0) return null;
  return (
    <div className="flex flex-none overflow-x-auto border-b border-line bg-panel">
      {paths.map((path) => {
        const name = path.split("/").pop() ?? path;
        const active = path === activePath;
        const dirty = dirtyPaths.has(path);
        return (
          <div
            key={path}
            onClick={() => onSelect(path)}
            title={path}
            className={`group flex flex-none cursor-pointer items-center gap-1.5 border-r border-line px-3 py-2 font-mono text-[11px] ${
              active
                ? "border-t-2 border-t-cyan bg-bg text-fg"
                : "border-t-2 border-t-transparent text-fg2 hover:text-fg"
            }`}
          >
            {dirty && <span className="text-[9px] text-amber">●</span>}
            <span>{name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose(path);
              }}
              className="cursor-pointer text-fg3 opacity-0 group-hover:opacity-100 hover:text-red"
            >
              <X size={11} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
