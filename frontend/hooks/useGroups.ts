"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Group } from "@/lib/types";

const GROUP_KEY = "nexa_planner_group";

/** Grupos donde el usuario es miembro, con el último elegido recordado en
 * localStorage. Planner y calendario comparten la clave, así que cambiar de
 * grupo en uno deja al otro en el mismo. */
export function useGroups() {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [groupId, setGroupId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Group[]>("/api/groups")
      .then((all) => {
        const mine = all.filter((g) => g.is_member);
        setGroups(mine);
        const stored = Number(localStorage.getItem(GROUP_KEY));
        const initial = mine.find((g) => g.id === stored) ?? mine[0];
        if (initial) setGroupId(initial.id);
      })
      .catch((e) => setError(e.message));
  }, []);

  const selectGroup = useCallback((id: number) => {
    setGroupId(id);
    localStorage.setItem(GROUP_KEY, String(id));
  }, []);

  const group = groups?.find((g) => g.id === groupId) ?? null;

  return {
    groups,
    groupId,
    group,
    members: group?.members ?? [],
    selectGroup,
    error,
  };
}
