"use client";

import { ChevronDown, ChevronRight, File, FileCode, Folder, FolderOpen } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Tree, type NodeRendererProps } from "react-arborist";
import type { GhTreeEntry } from "@/lib/github";

interface TreeDatum {
  id: string; // path completo
  name: string;
  children?: TreeDatum[];
}

const CODE_EXTS = new Set([
  "ts", "tsx", "js", "jsx", "py", "rs", "go", "java", "c", "h", "cpp", "cs",
  "rb", "php", "swift", "kt", "css", "scss", "html", "json", "yml", "yaml",
  "toml", "sql", "sh", "md",
]);

function buildTree(entries: GhTreeEntry[]): TreeDatum[] {
  const roots: TreeDatum[] = [];
  const byPath = new Map<string, TreeDatum>();

  const sorted = [...entries].sort((a, b) => a.path.localeCompare(b.path));
  for (const e of sorted) {
    const name = e.path.split("/").pop() ?? e.path;
    const node: TreeDatum = { id: e.path, name };
    if (e.type === "tree") node.children = [];
    byPath.set(e.path, node);

    const parentPath = e.path.includes("/")
      ? e.path.slice(0, e.path.lastIndexOf("/"))
      : null;
    const parent = parentPath ? byPath.get(parentPath) : null;
    if (parent?.children) parent.children.push(node);
    else roots.push(node);
  }

  const sortLevel = (nodes: TreeDatum[]) => {
    nodes.sort((a, b) => {
      const aDir = a.children ? 0 : 1;
      const bDir = b.children ? 0 : 1;
      return aDir - bDir || a.name.localeCompare(b.name);
    });
    nodes.forEach((n) => n.children && sortLevel(n.children));
  };
  sortLevel(roots);
  return roots;
}

export default function FileTree({
  entries,
  dirtyPaths,
  activePath,
  onOpenFile,
}: {
  entries: GhTreeEntry[];
  dirtyPaths: Set<string>;
  activePath: string | null;
  onOpenFile: (path: string) => void;
}) {
  const data = useMemo(() => buildTree(entries), [entries]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 260, height: 400 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function Node({ node, style }: NodeRendererProps<TreeDatum>) {
    const isDir = !node.isLeaf;
    const ext = node.data.name.split(".").pop()?.toLowerCase() ?? "";
    const FileIcon = CODE_EXTS.has(ext) ? FileCode : File;
    const active = node.data.id === activePath;
    return (
      <div
        style={style}
        onClick={() => (isDir ? node.toggle() : onOpenFile(node.data.id))}
        className={`flex h-full cursor-pointer items-center gap-1.5 pr-2 font-mono text-xs ${
          active ? "bg-cyan/10 text-fg" : "text-fg2 hover:bg-panel2 hover:text-fg"
        }`}
      >
        {isDir ? (
          <>
            {node.isOpen ? (
              <ChevronDown size={12} className="flex-none text-fg3" />
            ) : (
              <ChevronRight size={12} className="flex-none text-fg3" />
            )}
            {node.isOpen ? (
              <FolderOpen size={13} className="flex-none text-cyan/70" />
            ) : (
              <Folder size={13} className="flex-none text-cyan/70" />
            )}
          </>
        ) : (
          <FileIcon size={13} className="ml-[14px] flex-none text-fg3" />
        )}
        <span className="truncate">{node.data.name}</span>
        {dirtyPaths.has(node.data.id) && (
          <span className="ml-auto flex-none text-[9px] text-amber">●</span>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden">
      <Tree<TreeDatum>
        data={data}
        width={size.width}
        height={size.height}
        rowHeight={24}
        indent={12}
        openByDefault={false}
        disableDrag
        disableDrop
        disableEdit
      >
        {Node}
      </Tree>
    </div>
  );
}
