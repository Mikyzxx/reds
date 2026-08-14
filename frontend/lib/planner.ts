import type { TaskPriority, TaskStatus } from "./types";

/** Las clases de Tailwind se escriben completas (no interpoladas) para que el
 * compilador las detecte al escanear el código. */
export const COLUMNS: {
  status: TaskStatus;
  label: string;
  dot: string;
  text: string;
  ring: string;
  /** barra del calendario */
  bar: string;
}[] = [
  {
    status: "pendiente",
    label: "PENDIENTE",
    dot: "bg-fg3",
    text: "text-fg2",
    ring: "border-fg3/50",
    bar: "border-fg3/50 bg-fg3/15 text-fg",
  },
  {
    status: "en_progreso",
    label: "EN PROGRESO",
    dot: "bg-cyan",
    text: "text-cyan",
    ring: "border-cyan/50",
    bar: "border-cyan/50 bg-cyan/15 text-cyan-hi",
  },
  {
    status: "en_prueba",
    label: "EN PRUEBA",
    dot: "bg-amber",
    text: "text-amber",
    ring: "border-amber/50",
    bar: "border-amber/50 bg-amber/15 text-amber",
  },
  {
    status: "terminado",
    label: "TERMINADO",
    dot: "bg-green",
    text: "text-green",
    ring: "border-green/50",
    bar: "border-green/50 bg-green/15 text-green",
  },
];

export const STATUSES = COLUMNS.map((c) => c.status);

export function columnMeta(status: TaskStatus) {
  return COLUMNS.find((c) => c.status === status) ?? COLUMNS[0];
}

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
