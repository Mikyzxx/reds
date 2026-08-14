"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  SquareKanban,
  X,
} from "lucide-react";
import GroupChips from "@/components/GroupChips";
import { useGroups } from "@/hooks/useGroups";
import { api } from "@/lib/api";
import {
  addDays,
  addMonths,
  daysBetween,
  formatFull,
  formatMonthYear,
  formatRange,
  isSameDay,
  monthGridStart,
  parseISODate,
  taskRange,
  today,
} from "@/lib/dates";
import { columnMeta, priorityMeta } from "@/lib/planner";
import type { Task } from "@/lib/types";

const WEEKDAYS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
const WEEKS = 6;

interface Segment {
  task: Task;
  /** columna 0..6 dentro de la semana */
  from: number;
  to: number;
  openLeft: boolean;
  openRight: boolean;
  lane: number;
}

/** Trozos de las tareas que caen dentro de la semana que arranca en
 * `weekStart`, repartidos en carriles para que no se solapen. */
function weekSegments(tasks: Task[], weekStart: Date): Segment[] {
  const weekEnd = addDays(weekStart, 6);
  const raw = tasks
    .map((task) => {
      const range = taskRange(task);
      if (!range || range.to < weekStart || range.from > weekEnd) return null;
      return {
        task,
        from: Math.max(0, daysBetween(weekStart, range.from)),
        to: Math.min(6, daysBetween(weekStart, range.to)),
        openLeft: range.from < weekStart,
        openRight: range.to > weekEnd,
        lane: 0,
      };
    })
    .filter((s): s is Segment => s !== null)
    .sort(
      (a, b) => a.from - b.from || b.to - b.from - (a.to - a.from) || a.task.id - b.task.id,
    );

  const lanes: number[] = []; // última columna ocupada por carril
  for (const segment of raw) {
    let lane = lanes.findIndex((lastCol) => lastCol < segment.from);
    if (lane === -1) lane = lanes.length;
    lanes[lane] = segment.to;
    segment.lane = lane;
  }
  return raw;
}

export default function CalendarPage() {
  const { groups, groupId, selectGroup, error: groupsError } = useGroups();
  const [board, setBoard] = useState<{ groupId: number; items: Task[] } | null>(
    null,
  );
  const [taskError, setTaskError] = useState<string | null>(null);
  const [month, setMonth] = useState(() => {
    const now = today();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const error = taskError ?? groupsError;
  const tasks = board && board.groupId === groupId ? board.items : null;
  const selected = tasks?.find((t) => t.id === selectedId) ?? null;

  const load = useCallback(() => {
    if (groupId === null) return;
    api<Task[]>(`/api/tasks?group_id=${groupId}`)
      .then((items) => setBoard({ groupId, items }))
      .catch((e) => setTaskError(e.message));
  }, [groupId]);

  useEffect(() => {
    load();
  }, [load]);

  const gridStart = useMemo(() => monthGridStart(month), [month]);
  const weeks = useMemo(
    () =>
      Array.from({ length: WEEKS }, (_, w) => {
        const weekStart = addDays(gridStart, w * 7);
        return {
          weekStart,
          days: Array.from({ length: 7 }, (_, d) => addDays(weekStart, d)),
          segments: weekSegments(tasks ?? [], weekStart),
        };
      }),
    [gridStart, tasks],
  );

  const scheduled = (tasks ?? []).filter((t) => taskRange(t) !== null);
  const unscheduled = (tasks ?? []).filter((t) => taskRange(t) === null);
  const now = today();

  async function saveDates(task: Task, start: string, end: string) {
    try {
      const updated = await api<Task>(`/api/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          start_date: start || null,
          end_date: end || null,
        }),
      });
      setBoard((prev) =>
        prev === null
          ? prev
          : {
              ...prev,
              items: prev.items.map((t) => (t.id === updated.id ? updated : t)),
            },
      );
      setTaskError(null);
    } catch (e) {
      setTaskError(
        e instanceof Error ? e.message : "No se pudieron guardar las fechas",
      );
      load();
    }
  }

  if (groups !== null && groups.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center border border-cyan/30 bg-cyan/10 text-cyan">
          <CalendarDays size={26} strokeWidth={1.5} />
        </div>
        <div className="max-w-[360px] text-[13px] leading-relaxed text-fg2">
          El calendario muestra las tareas del grupo y todavía no perteneces a
          ninguno.
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
          <div className="text-xl font-bold first-letter:uppercase">
            {formatMonthYear(month)}
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-fg2">
            {tasks
              ? `${scheduled.length} tareas con fechas · ${unscheduled.length} sin programar`
              : "cargando…"}
          </div>
        </div>

        <div className="flex flex-none items-center gap-1.5">
          <button
            title="Mes anterior"
            onClick={() => setMonth((m) => addMonths(m, -1))}
            className="cursor-pointer border border-line2 p-2 text-fg2 hover:border-cyan/40 hover:text-cyan"
          >
            <ChevronLeft size={13} strokeWidth={2} />
          </button>
          <button
            onClick={() => setMonth(new Date(now.getFullYear(), now.getMonth(), 1))}
            className="cursor-pointer border border-line2 px-3 py-2 font-mono text-[10px] tracking-[2px] text-fg2 hover:border-cyan/40 hover:text-cyan"
          >
            HOY
          </button>
          <button
            title="Mes siguiente"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            className="cursor-pointer border border-line2 p-2 text-fg2 hover:border-cyan/40 hover:text-cyan"
          >
            <ChevronRight size={13} strokeWidth={2} />
          </button>
        </div>

        <GroupChips groups={groups} groupId={groupId} onSelect={selectGroup} />

        <Link
          href="/app/planner"
          className="flex flex-none items-center gap-1.5 border border-line2 px-3 py-2 font-mono text-[10px] tracking-[2px] text-fg2 hover:border-cyan/40 hover:text-cyan"
        >
          <SquareKanban size={12} strokeWidth={2} />
          PLANNER
        </Link>
      </header>

      {error && (
        <div className="mx-7 mt-4 border border-red/40 bg-red/10 px-3 py-2 font-mono text-[11px] text-red-hi">
          ✕ {error}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col p-7 pb-0">
          <div className="grid grid-cols-7 border border-line bg-panel">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="border-r border-line px-2 py-1.5 text-center font-mono text-[10px] tracking-[2px] text-fg3 last:border-r-0"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid min-h-0 flex-1 grid-rows-6 border-r border-b border-l border-line">
            {weeks.map(({ weekStart, days, segments }) => (
              <div
                key={weekStart.toISOString()}
                className="relative min-h-0 border-b border-line last:border-b-0"
              >
                <div className="absolute inset-0 grid grid-cols-7">
                  {days.map((day) => {
                    const isToday = isSameDay(day, now);
                    const outside = day.getMonth() !== month.getMonth();
                    return (
                      <div
                        key={day.toISOString()}
                        className={`border-r border-line last:border-r-0 ${
                          outside ? "bg-bg/60" : "bg-panel/30"
                        } ${isToday ? "bg-cyan/5" : ""}`}
                      >
                        <span
                          className={`m-1 flex h-5 w-5 items-center justify-center font-mono text-[10px] ${
                            isToday
                              ? "bg-cyan font-semibold text-[#04121a]"
                              : outside
                                ? "text-fg3/60"
                                : "text-fg2"
                          }`}
                        >
                          {day.getDate()}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="relative grid h-full auto-rows-[21px] grid-cols-7 gap-y-1 overflow-y-auto px-1 pt-7 pb-1">
                  {segments.map((s) => {
                    const meta = columnMeta(s.task.status);
                    return (
                      <button
                        key={s.task.id}
                        onClick={() => setSelectedId(s.task.id)}
                        title={`${s.task.title} · ${formatRange(s.task.start_date, s.task.end_date)}`}
                        style={{
                          gridColumn: `${s.from + 1} / span ${s.to - s.from + 1}`,
                          gridRow: s.lane + 1,
                        }}
                        className={`flex cursor-pointer items-center gap-1 truncate border px-1.5 text-left font-mono text-[10px] leading-[19px] ${meta.bar} ${
                          s.openLeft ? "border-l-0" : ""
                        } ${s.openRight ? "border-r-0" : ""} ${
                          selectedId === s.task.id ? "ring-1 ring-cyan" : ""
                        }`}
                      >
                        {s.openLeft && <span className="text-fg3">‹</span>}
                        <span className="truncate">{s.task.title}</span>
                        {s.openRight && (
                          <span className="ml-auto text-fg3">›</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto py-3">
            <span className="flex-none font-mono text-[10px] tracking-[2px] text-fg3">
              SIN PROGRAMAR · {unscheduled.length}
            </span>
            {unscheduled.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`flex-none cursor-pointer border px-2 py-1 font-mono text-[10px] hover:border-cyan/40 ${
                  selectedId === t.id
                    ? "border-cyan/40 text-cyan"
                    : "border-line2 text-fg2"
                }`}
              >
                {t.title}
              </button>
            ))}
            {tasks !== null && unscheduled.length === 0 && (
              <span className="font-mono text-[10px] text-fg3">
                todas las tareas tienen fechas
              </span>
            )}
          </div>
        </div>

        {selected && (
          // la key remonta el panel al cambiar de tarea, así sus inputs de
          // fecha se reinician con los valores de la tarea nueva
          <TaskPanel
            key={selected.id}
            task={selected}
            onClose={() => setSelectedId(null)}
            onSave={(start, end) => saveDates(selected, start, end)}
          />
        )}
      </div>
    </div>
  );
}

function TaskPanel({
  task,
  onClose,
  onSave,
}: {
  task: Task;
  onClose: () => void;
  onSave: (start: string, end: string) => Promise<void>;
}) {
  const [start, setStart] = useState(task.start_date ?? "");
  const [end, setEnd] = useState(task.end_date ?? "");
  const [saving, setSaving] = useState(false);
  const meta = columnMeta(task.status);
  const priority = priorityMeta(task.priority);
  const badRange = Boolean(start && end && end < start);
  const dirty = start !== (task.start_date ?? "") || end !== (task.end_date ?? "");

  async function save() {
    if (badRange || saving) return;
    setSaving(true);
    try {
      await onSave(start, end);
    } finally {
      setSaving(false);
    }
  }

  const INPUT =
    "w-full border border-line2 bg-field px-2.5 py-2 font-mono text-[12px] text-fg outline-none focus:border-cyan/50 cursor-pointer";

  return (
    <aside className="flex w-[320px] flex-none flex-col gap-4 overflow-y-auto border-l border-line bg-panel p-5">
      <div className="flex items-start gap-2">
        <span className="min-w-0 flex-1 text-[15px] leading-snug font-semibold break-words">
          {task.title}
        </span>
        <button
          title="Cerrar"
          onClick={onClose}
          className="cursor-pointer text-fg3 hover:text-fg"
        >
          <X size={14} strokeWidth={2} />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`flex items-center gap-1.5 border px-2 py-1 font-mono text-[9px] tracking-[1px] ${meta.bar}`}
        >
          <span className={`h-1.5 w-1.5 ${meta.dot}`} />
          {meta.label}
        </span>
        <span
          className={`border px-2 py-1 font-mono text-[9px] tracking-[1px] ${priority.chip}`}
        >
          {priority.label}
        </span>
      </div>

      {task.description && (
        <p className="text-[12px] leading-relaxed text-fg2">
          {task.description}
        </p>
      )}

      <div className="flex items-center gap-2">
        {task.assignee ? (
          <>
            <span className="flex h-[22px] w-[22px] items-center justify-center border border-line2 bg-[#131a24] font-mono text-[9px] text-fg2">
              {task.assignee.initials}
            </span>
            <span className="font-mono text-[10px] text-fg2">
              {task.assignee.display_name}
            </span>
          </>
        ) : (
          <span className="font-mono text-[10px] text-fg3">sin asignar</span>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-line pt-4">
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[9px] tracking-[2px] text-fg3">
            INICIO
          </span>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className={INPUT}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[9px] tracking-[2px] text-fg3">
            FIN
          </span>
          <input
            type="date"
            value={end}
            min={start || undefined}
            onChange={(e) => setEnd(e.target.value)}
            className={INPUT}
          />
        </label>
        {badRange && (
          <div className="font-mono text-[10px] text-red-hi">
            ✕ La fecha de fin no puede ser anterior a la de inicio
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={saving || badRange || !dirty}
            className="flex-1 cursor-pointer bg-cyan px-3 py-2 font-mono text-[10px] font-semibold tracking-[2px] text-[#04121a] hover:bg-cyan-hi disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "GUARDANDO…" : "GUARDAR FECHAS"}
          </button>
          <button
            onClick={() => {
              setStart("");
              setEnd("");
            }}
            className="cursor-pointer border border-line2 px-3 py-2 font-mono text-[10px] tracking-[2px] text-fg2 hover:border-red/40 hover:text-red-hi"
          >
            QUITAR
          </button>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-1 border-t border-line pt-4 font-mono text-[10px] text-fg3">
        {task.start_date ? (
          <span>inicio: {formatFull(parseISODate(task.start_date))}</span>
        ) : (
          <span>sin fecha de inicio</span>
        )}
        {task.end_date ? (
          <span>fin: {formatFull(parseISODate(task.end_date))}</span>
        ) : (
          <span>sin fecha de fin</span>
        )}
        <Link href="/app/planner" className="mt-2 text-cyan hover:underline">
          abrir en el planner →
        </Link>
      </div>
    </aside>
  );
}
