"use client";

import { FormEvent, useState } from "react";
import { PRIORITIES } from "@/lib/planner";
import type { TaskPriority, User } from "@/lib/types";

export interface TaskFormValues {
  title: string;
  description: string;
  priority: TaskPriority;
  assignee_id: number | null;
  start_date: string | null;
  end_date: string | null;
}

const INPUT =
  "w-full border border-line2 bg-field px-2.5 py-2 font-mono text-[12px] text-fg outline-none focus:border-cyan/50";

/** Campos compartidos por el alta y la edición de tarjetas del planner. */
export default function TaskForm({
  members,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  members: User[];
  initial?: Partial<TaskFormValues>;
  submitLabel: string;
  onSubmit: (values: TaskFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [priority, setPriority] = useState<TaskPriority>(
    initial?.priority ?? "media",
  );
  const [assigneeId, setAssigneeId] = useState<number | null>(
    initial?.assignee_id ?? null,
  );
  const [startDate, setStartDate] = useState(initial?.start_date ?? "");
  const [endDate, setEndDate] = useState(initial?.end_date ?? "");
  const [saving, setSaving] = useState(false);

  const badRange = Boolean(startDate && endDate && endDate < startDate);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || saving || badRange) return;
    setSaving(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        priority,
        assignee_id: assigneeId,
        start_date: startDate || null,
        end_date: endDate || null,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título de la tarea"
        maxLength={200}
        className={INPUT}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descripción (opcional)"
        rows={2}
        maxLength={1000}
        className={`${INPUT} resize-none`}
      />
      <div className="flex gap-2">
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as TaskPriority)}
          className={`${INPUT} flex-1 cursor-pointer`}
        >
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <select
          value={assigneeId ?? ""}
          onChange={(e) =>
            setAssigneeId(e.target.value ? Number(e.target.value) : null)
          }
          className={`${INPUT} flex-1 cursor-pointer`}
        >
          <option value="">Sin asignar</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.display_name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className="font-mono text-[9px] tracking-[2px] text-fg3">
            INICIO
          </span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={`${INPUT} cursor-pointer`}
          />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="font-mono text-[9px] tracking-[2px] text-fg3">
            FIN
          </span>
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => setEndDate(e.target.value)}
            className={`${INPUT} cursor-pointer`}
          />
        </label>
      </div>
      {badRange && (
        <div className="font-mono text-[10px] text-red-hi">
          ✕ La fecha de fin no puede ser anterior a la de inicio
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !title.trim() || badRange}
          className="flex-1 cursor-pointer bg-cyan px-3 py-2 font-mono text-[10px] font-semibold tracking-[2px] text-[#04121a] hover:bg-cyan-hi disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? "GUARDANDO…" : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer border border-line2 px-3 py-2 font-mono text-[10px] tracking-[2px] text-fg2 hover:text-fg"
        >
          CANCELAR
        </button>
      </div>
    </form>
  );
}
