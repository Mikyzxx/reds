"use client";

import { DragEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus, SquareKanban } from "lucide-react";
import GroupChips from "@/components/GroupChips";
import TaskCard from "@/components/TaskCard";
import TaskForm, { TaskFormValues } from "@/components/TaskForm";
import { useGroups } from "@/hooks/useGroups";
import { api } from "@/lib/api";
import { COLUMNS, STATUSES } from "@/lib/planner";
import type { Task, TaskStatus } from "@/lib/types";

/** Reordena en local igual que lo hará el backend: saca la tarea, la inserta
 * en `target` dentro de su columna nueva y renumera todas las posiciones. */
function moveLocal(
  all: Task[],
  id: number,
  status: TaskStatus,
  target: number,
): Task[] {
  const moving = all.find((t) => t.id === id);
  if (!moving) return all;
  const rest = all.filter((t) => t.id !== id);
  const columns = new Map<TaskStatus, Task[]>(
    STATUSES.map((s) => [
      s,
      rest.filter((t) => t.status === s).sort((a, b) => a.position - b.position),
    ]),
  );
  const column = columns.get(status)!;
  column.splice(Math.max(0, Math.min(target, column.length)), 0, {
    ...moving,
    status,
  });
  return STATUSES.flatMap((s) =>
    columns.get(s)!.map((t, i) => ({ ...t, position: i })),
  );
}

export default function PlannerPage() {
  const {
    groups,
    groupId,
    members,
    selectGroup: pickGroup,
    error: groupsError,
  } = useGroups();
  // El tablero recuerda de qué grupo son sus tareas: al cambiar de grupo la
  // vista vuelve sola a "cargando…" sin resetear estado desde un efecto.
  const [board, setBoard] = useState<{ groupId: number; items: Task[] } | null>(
    null,
  );
  const [taskError, setTaskError] = useState<string | null>(null);
  const error = taskError ?? groupsError;

  const [creatingIn, setCreatingIn] = useState<TaskStatus | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dropAt, setDropAt] = useState<{
    status: TaskStatus;
    index: number;
  } | null>(null);
  const dragIdRef = useRef<number | null>(null);

  const tasks = board && board.groupId === groupId ? board.items : null;
  const busy =
    draggingId !== null || editingId !== null || creatingIn !== null;

  const setTasks = useCallback(
    (update: Task[] | ((prev: Task[]) => Task[])) =>
      setBoard((prev) =>
        prev === null
          ? prev
          : {
              ...prev,
              items: typeof update === "function" ? update(prev.items) : update,
            },
      ),
    [],
  );

  const load = useCallback(() => {
    if (groupId === null) return;
    api<Task[]>(`/api/tasks?group_id=${groupId}`)
      .then((items) => setBoard({ groupId, items }))
      .catch((e) => setTaskError(e.message));
  }, [groupId]);

  useEffect(() => {
    load();
  }, [load]);

  // Refresco periódico para ver los cambios del resto del equipo, en pausa
  // mientras se arrastra o hay un formulario abierto.
  useEffect(() => {
    if (busy || groupId === null) return;
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, [busy, groupId, load]);

  function selectGroup(id: number) {
    pickGroup(id);
    setCreatingIn(null);
    setEditingId(null);
  }

  function fail(e: unknown, fallback: string) {
    setTaskError(e instanceof Error ? e.message : fallback);
    load();
  }

  async function createTask(status: TaskStatus, values: TaskFormValues) {
    if (groupId === null) return;
    try {
      const task = await api<Task>("/api/tasks", {
        method: "POST",
        body: JSON.stringify({ ...values, group_id: groupId, status }),
      });
      setTasks((prev) => [...prev, task]);
      setCreatingIn(null);
      setTaskError(null);
    } catch (e) {
      fail(e, "No se pudo crear la tarea");
    }
  }

  async function saveTask(task: Task, values: TaskFormValues) {
    try {
      const updated = await api<Task>(`/api/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify(values),
      });
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setEditingId(null);
      setTaskError(null);
    } catch (e) {
      fail(e, "No se pudo guardar la tarea");
    }
  }

  async function deleteTask(task: Task) {
    if (!confirm(`¿Borrar la tarea “${task.title}”?`)) return;
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    try {
      await api(`/api/tasks/${task.id}`, { method: "DELETE" });
    } catch (e) {
      fail(e, "No se pudo borrar la tarea");
    }
  }

  function columnTasks(status: TaskStatus): Task[] {
    return (tasks ?? [])
      .filter((t) => t.status === status)
      .sort((a, b) => a.position - b.position);
  }

  async function drop(status: TaskStatus) {
    const id = dragIdRef.current;
    const current = tasks ?? [];
    const task = current.find((t) => t.id === id);
    setDropAt(null);
    setDraggingId(null);
    dragIdRef.current = null;
    if (!task || id === null) return;

    const column = columnTasks(status);
    let target =
      dropAt && dropAt.status === status ? dropAt.index : column.length;
    // El backend saca la tarea antes de insertarla: si venía de más arriba en
    // la misma columna, el índice visible se desplaza uno.
    if (task.status === status) {
      const from = column.findIndex((t) => t.id === id);
      if (from > -1 && from < target) target -= 1;
      if (from === target) return;
    }

    setTasks(moveLocal(current, id, status, target));
    try {
      await api<Task>(`/api/tasks/${id}/move`, {
        method: "PATCH",
        body: JSON.stringify({ status, position: target }),
      });
      setTaskError(null);
    } catch (e) {
      setTasks(current);
      fail(e, "No se pudo mover la tarea");
    }
  }

  function overCard(
    e: DragEvent<HTMLDivElement>,
    status: TaskStatus,
    index: number,
  ) {
    if (draggingId === null) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const after = e.clientY > rect.top + rect.height / 2;
    setDropAt({ status, index: after ? index + 1 : index });
  }

  if (groups !== null && groups.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center border border-cyan/30 bg-cyan/10 text-cyan">
          <SquareKanban size={26} strokeWidth={1.5} />
        </div>
        <div className="max-w-[360px] text-[13px] leading-relaxed text-fg2">
          El planner es por grupo y todavía no perteneces a ninguno. Únete a uno
          para empezar a crear tareas.
        </div>
        <Link
          href="/app/calls"
          className="border border-cyan/40 bg-cyan/10 px-4 py-2 font-mono text-[11px] tracking-[2px] text-cyan hover:bg-cyan/20"
        >
          IR A GRUPOS
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex items-center gap-4 border-b border-line px-7 py-5">
        <div className="min-w-0">
          <div className="text-xl font-bold">Planner</div>
          <div className="mt-0.5 font-mono text-[11px] text-fg2">
            {tasks
              ? `${tasks.length} tareas · arrastra las tarjetas entre columnas`
              : "cargando…"}
          </div>
        </div>

        <GroupChips groups={groups} groupId={groupId} onSelect={selectGroup} />

        <button
          onClick={() =>
            setCreatingIn((v) => (v === "pendiente" ? null : "pendiente"))
          }
          className="flex flex-none cursor-pointer items-center gap-1.5 bg-cyan px-4 py-[9px] font-mono text-[11px] font-semibold tracking-wide text-[#04121a] hover:bg-cyan-hi"
        >
          <Plus size={13} strokeWidth={2.5} />
          TAREA
        </button>
      </header>

      {error && (
        <div className="mx-7 mt-4 border border-red/40 bg-red/10 px-3 py-2 font-mono text-[11px] text-red-hi">
          ✕ {error}
        </div>
      )}

      <div className="grid flex-1 grid-cols-4 gap-4 overflow-hidden p-7">
        {COLUMNS.map((col) => {
          const items = columnTasks(col.status);
          const dropIndex =
            dropAt && dropAt.status === col.status ? dropAt.index : null;
          return (
            <section
              key={col.status}
              onDragOver={(e) => {
                if (draggingId === null) return;
                e.preventDefault();
                setDropAt({ status: col.status, index: items.length });
              }}
              onDrop={(e) => {
                e.preventDefault();
                drop(col.status);
              }}
              className={`flex min-h-0 flex-col border bg-panel/40 ${
                dropIndex !== null ? col.ring : "border-line"
              }`}
            >
              <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
                <span className={`h-1.5 w-1.5 ${col.dot}`} />
                <span
                  className={`font-mono text-[10px] tracking-[2px] ${col.text}`}
                >
                  {col.label}
                </span>
                <span className="font-mono text-[10px] text-fg3">
                  {items.length}
                </span>
                <button
                  title="Nueva tarea en esta columna"
                  onClick={() =>
                    setCreatingIn((v) => (v === col.status ? null : col.status))
                  }
                  className="ml-auto cursor-pointer text-fg3 hover:text-cyan"
                >
                  <Plus size={14} strokeWidth={2} />
                </button>
              </div>

              <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2.5">
                {creatingIn === col.status && (
                  <div className="border border-cyan/40 bg-panel2 p-3">
                    <TaskForm
                      members={members}
                      submitLabel="CREAR"
                      onSubmit={(values) => createTask(col.status, values)}
                      onCancel={() => setCreatingIn(null)}
                    />
                  </div>
                )}

                {items.map((task, index) => (
                  // La marca de inserción va como box-shadow para no alterar la
                  // altura de la lista mientras se arrastra (evita parpadeos).
                  <div
                    key={task.id}
                    className={
                      dropIndex === index
                        ? "shadow-[0_-5px_0_-2px_var(--color-cyan)]"
                        : dropIndex !== null &&
                            dropIndex >= items.length &&
                            index === items.length - 1
                          ? "shadow-[0_5px_0_-2px_var(--color-cyan)]"
                          : ""
                    }
                  >
                    <TaskCard
                      task={task}
                      members={members}
                      editing={editingId === task.id}
                      dragging={draggingId === task.id}
                      onStartEdit={() => setEditingId(task.id)}
                      onCancelEdit={() => setEditingId(null)}
                      onSave={(values) => saveTask(task, values)}
                      onDelete={() => deleteTask(task)}
                      onDragStart={() => {
                        dragIdRef.current = task.id;
                        setDraggingId(task.id);
                      }}
                      onDragEnd={() => {
                        dragIdRef.current = null;
                        setDraggingId(null);
                        setDropAt(null);
                      }}
                      onDragOver={(e) => overCard(e, col.status, index)}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        drop(col.status);
                      }}
                    />
                  </div>
                ))}

                {dropIndex !== null && items.length === 0 && (
                  <div className="h-[2px] bg-cyan" />
                )}

                {tasks !== null &&
                  items.length === 0 &&
                  creatingIn !== col.status && (
                    <div className="py-8 text-center font-mono text-[10px] text-fg3">
                      sin tareas
                    </div>
                  )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
