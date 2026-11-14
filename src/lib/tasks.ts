import { addDays, format, isSameYear, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { Database } from "@/integrations/supabase/types";

export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Priority = Database["public"]["Enums"]["task_priority"];
export type TaskStatus = Database["public"]["Enums"]["task_status"];

export const PRIORITIES: Priority[] = ["high", "medium", "low"];
export const PRIORITY_LABEL: Record<Priority, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};
const PRIORITY_RANK: Record<Priority, number> = { high: 3, medium: 2, low: 1 };

/** Filters stored in the URL. `status` defaults to pending and is never written. */
export interface TaskFilters {
  q?: string;
  cat?: string; // category uuid or "none"
  prio?: Priority;
  status?: "all" | "completed";
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Parse raw search params, silently dropping invalid values. */
export function parseTaskFilters(search: Record<string, unknown>): TaskFilters {
  const out: TaskFilters = {};
  if (typeof search["q"] === "string" && search["q"].trim() !== "") out.q = search["q"];
  if (typeof search["cat"] === "string" && (search["cat"] === "none" || UUID_RE.test(search["cat"]))) {
    out.cat = search["cat"];
  }
  if (typeof search["prio"] === "string" && (PRIORITIES as string[]).includes(search["prio"])) {
    out.prio = search["prio"] as Priority;
  }
  if (search["status"] === "all" || search["status"] === "completed") out.status = search["status"];
  return out;
}

export function hasActiveFilters(f: TaskFilters): boolean {
  return Boolean(f.q || f.cat || f.prio || f.status);
}

/** Lowercase and strip accents so "camion" matches "Camión". */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Local calendar date as yyyy-MM-dd (never UTC). */
export function todayKey(now: Date = new Date()): string {
  return format(now, "yyyy-MM-dd");
}

export function isOverdue(task: Pick<Task, "status" | "due_date">, today: string): boolean {
  return task.status === "pending" && task.due_date !== null && task.due_date < today;
}

export function matchesFilters(task: Task, f: TaskFilters): boolean {
  const status = f.status ?? "pending";
  if (status !== "all" && task.status !== status) return false;
  if (f.prio && task.priority !== f.prio) return false;
  if (f.cat === "none" && task.category_id !== null) return false;
  if (f.cat && f.cat !== "none" && task.category_id !== f.cat) return false;
  if (f.q) {
    const needle = normalizeText(f.q);
    const haystack = normalizeText(`${task.title} ${task.description ?? ""}`);
    if (!haystack.includes(needle)) return false;
  }
  return true;
}

/** Priority high→low, then due date ascending (no date last), then newest first. */
export function compareTasks(a: Task, b: Task): number {
  const p = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
  if (p !== 0) return p;
  if (a.due_date !== b.due_date) {
    if (a.due_date === null) return 1;
    if (b.due_date === null) return -1;
    return a.due_date < b.due_date ? -1 : 1;
  }
  return b.created_at.localeCompare(a.created_at);
}

export interface TaskStats {
  pending: number;
  completed: number;
  highPriority: number;
  overdue: number;
}

/** Global counters: they never depend on filters or search. */
export function computeStats(tasks: Task[], today: string): TaskStats {
  const stats: TaskStats = { pending: 0, completed: 0, highPriority: 0, overdue: 0 };
  for (const t of tasks) {
    if (t.status === "completed") {
      stats.completed++;
      continue;
    }
    stats.pending++;
    if (t.priority === "high") stats.highPriority++;
    if (isOverdue(t, today)) stats.overdue++;
  }
  return stats;
}

/** "Hoy", "Mañana", "20 nov" (adds the year when it is not the current one). */
export function formatDueDate(dueDate: string, now: Date = new Date()): string {
  const today = todayKey(now);
  if (dueDate === today) return "Hoy";
  if (dueDate === todayKey(addDays(now, 1))) return "Mañana";
  const date = parseISO(dueDate);
  const label = format(date, "d MMM", { locale: es }).replace(".", "");
  return isSameYear(date, now) ? label : `${label} ${format(date, "yyyy")}`;
}

export function sortCategories(categories: Category[]): Category[] {
  return [...categories].sort((a, b) => a.name.localeCompare(b.name, "es"));
}
