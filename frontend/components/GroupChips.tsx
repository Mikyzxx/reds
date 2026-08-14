"use client";

import { UsersRound } from "lucide-react";
import type { Group } from "@/lib/types";

/** Selector de grupo del header; lo comparten planner y calendario. */
export default function GroupChips({
  groups,
  groupId,
  onSelect,
}: {
  groups: Group[] | null;
  groupId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="ml-auto flex max-w-[50%] items-center gap-1.5 overflow-x-auto">
      {groups?.map((g) => (
        <button
          key={g.id}
          onClick={() => onSelect(g.id)}
          title={`${g.members.length} miembros`}
          className={`flex flex-none cursor-pointer items-center gap-1.5 border px-3 py-2 font-mono text-[11px] tracking-wide ${
            g.id === groupId
              ? "border-cyan/40 bg-cyan/10 text-cyan"
              : "border-line2 text-fg2 hover:text-fg"
          }`}
        >
          <UsersRound size={11} strokeWidth={1.75} />
          {g.name}
        </button>
      ))}
    </div>
  );
}
