/** Utilidades de fecha en horario local.
 *
 * Las fechas de las tareas viajan como `YYYY-MM-DD` (sin hora). `new Date(iso)`
 * las interpretaría como UTC y en husos negativos se pintarían un día antes, así
 * que aquí siempre se construyen y formatean a mano en local. */

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(date: Date): string {
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function today(): Date {
  return startOfDay(new Date());
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

/** Días completos de `a` a `b` (negativo si `b` es anterior). */
export function daysBetween(a: Date, b: Date): number {
  return Math.round(
    (startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000,
  );
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Lunes de la semana en la que cae el día 1 del mes de `date`. */
export function monthGridStart(date: Date): Date {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const weekday = (first.getDay() + 6) % 7; // 0 = lunes
  return addDays(first, -weekday);
}

const DAY_MONTH = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
});
const MONTH_YEAR = new Intl.DateTimeFormat("es-ES", {
  month: "long",
  year: "numeric",
});
const FULL = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const clean = (s: string) => s.replace(/\./g, "");

export function formatDayMonth(date: Date): string {
  return clean(DAY_MONTH.format(date));
}

export function formatMonthYear(date: Date): string {
  return clean(MONTH_YEAR.format(date));
}

export function formatFull(date: Date): string {
  return clean(FULL.format(date));
}

/** Etiqueta corta del rango de una tarea: "12–18 ago", "12 ago",
 * "desde 12 ago" o "hasta 18 ago" según las fechas que tenga. */
export function formatRange(
  start: string | null,
  end: string | null,
): string | null {
  if (!start && !end) return null;
  if (start && !end) return `desde ${formatDayMonth(parseISODate(start))}`;
  if (!start && end) return `hasta ${formatDayMonth(parseISODate(end))}`;

  const from = parseISODate(start!);
  const to = parseISODate(end!);
  if (isSameDay(from, to)) return formatDayMonth(from);
  if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
    return `${from.getDate()}–${formatDayMonth(to)}`;
  }
  return `${formatDayMonth(from)} – ${formatDayMonth(to)}`;
}

/** Rango efectivo de una tarea: si solo tiene una fecha, dura ese día. */
export function taskRange(task: {
  start_date: string | null;
  end_date: string | null;
}): { from: Date; to: Date } | null {
  const iso = task.start_date ?? task.end_date;
  if (!iso) return null;
  const from = parseISODate(task.start_date ?? iso);
  const to = parseISODate(task.end_date ?? iso);
  return to < from ? { from: to, to: from } : { from, to };
}
