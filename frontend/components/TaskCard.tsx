"use client";

import { DragEvent } from "react";
import { CalendarDays, GripVertical, Pencil, Trash2 } from "lucide-react";
import TaskForm, { TaskFormValues } from "@/components/TaskForm";
import { formatRange, parseISODate, today } from "@/lib/dates";
import { priorityMeta } from "@/lib/planner";
import type { Task, User } from "@/lib/types";

export default function TaskCard({
  task,
  members,
  editing,
  dragging,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: {
  task: Task;
  members: User[];
  editing: boolean;
  dragging: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (values: TaskFormValues) => Promise<void>;
  onDelete: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
}) {
  const priority = priorityMeta(task.priority);
  const range = formatRange(task.start_date, task.end_date);
  const late =
    task.end_date !== null &&
    task.status !== "terminado" &&
    parseISODate(task.end_date) < today();

  if (editing) {
    return (
      <div className="border border-cyan/40 bg-panel2 p-3">
        <TaskForm
          members={members}
          initial={task}
          submitLabel="GUARDAR"
          onSubmit={onSave}
          onCancel={onCancelEdit}
        />
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(task.id));
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`group relative flex cursor-grab flex-col gap-2 border border-line2 bg-panel2 p-3 transition hover:border-cyan/40 active:cursor-grabbing ${
        dragging ? "opacity-40" : ""
      }`}
    >
      <span
        className={`absolute top-0 bottom-0 left-0 w-[2px] ${priority.bar}`}
      />
      <div className="flex items-start gap-2">
        <GripVertical
          size={13}
          strokeWidth={1.75}
          className="mt-0.5 flex-none text-fg3"
        />
        <span className="min-w-0 flex-1 text-[13px] leading-snug font-medium break-words">
          {task.title}
        </span>
        <div className="flex flex-none gap-1.5 opacity-0 transition group-hover:opacity-100">
          <button
            title="Editar tarea"
            onClick={onStartEdit}
            className="cursor-pointer text-fg3 hover:text-cyan"
          >
            <Pencil size={12} strokeWidth={1.75} />
          </button>
          <button
            title="Borrar tarea"
            onClick={onDelete}
            className="cursor-pointer text-fg3 hover:text-red"
          >
            <Trash2 size={12} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {task.description && (
        <p className="line-clamp-2 pl-[21px] text-[11px] leading-relaxed text-fg2">
          {task.description}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 pl-[21px]">
        <span
          className={`border px-1.5 py-0.5 font-mono text-[9px] tracking-[1px] ${priority.chip}`}
        >
          {priority.label}
        </span>
        {range && (
          <span
            title={late ? "Fecha de fin pasada" : "Fechas de la tarea"}
            className={`flex items-center gap-1 border px-1.5 py-0.5 font-mono text-[9px] ${
              late ? "border-red/40 text-red-hi" : "border-line2 text-fg2"
            }`}
          >
            <CalendarDays size={9} strokeWidth={2} />
            {range}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1.5">
          {task.assignee ? (
            <>
              <span
                title={task.assignee.display_name}
                className="flex h-[20px] w-[20px] items-center justify-center border border-line2 bg-[#131a24] font-mono text-[9px] text-fg2"
              >
                {task.assignee.initials}
              </span>
              <span className="max-w-[90px] truncate font-mono text-[9px] text-fg3">
                {task.assignee.display_name}
              </span>
            </>
          ) : (
            <span className="font-mono text-[9px] text-fg3">sin asignar</span>
          )}
        </span>
      </div>
    </div>
  );
}
