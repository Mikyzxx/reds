import type { TaskPriority, TaskStatus } from "./types";

/** Las clases de Tailwind se escriben completas (no interpoladas) para que el
 * compilador las detecte al escanear el código. */
export const COLUMNS: {
  status: TaskStatus;
  label: string;
  dot: string;
  text: string;
  ring: string;
}[] = [
  {
    status: "pendiente",
    label: "PENDIENTE",
    dot: "bg-fg3",
    text: "text-fg2",
    ring: "border-fg3/50",
  },
  {
    status: "en_progreso",
    label: "EN PROGRESO",
    dot: "bg-cyan",
    text: "text-cyan",
    ring: "border-cyan/50",
  },
  {
    status: "en_prueba",
    label: "EN PRUEBA",
    dot: "bg-amber",
    text: "text-amber",
    ring: "border-amber/50",
  },
  {
    status: "terminado",
    label: "TERMINADO",
    dot: "bg-green",
    text: "text-green",
    ring: "border-green/50",
  },
];

export const STATUSES = COLUMNS.map((c) => c.status);

export const PRIORITIES: {
  value: TaskPriority;
  label: string;
  chip: string;
  bar: string;
}[] = [
  { value: "alta", label: "ALTA", chip: "border-red/40 text-red-hi", bar: "bg-red" },
  { value: "media", label: "MEDIA", chip: "border-amber/40 text-amber", bar: "bg-amber" },
  { value: "baja", label: "BAJA", chip: "border-line2 text-fg3", bar: "bg-fg3" },
];

export function priorityMeta(priority: TaskPriority) {
  return PRIORITIES.find((p) => p.value === priority) ?? PRIORITIES[1];
}
