import { describe, expect, it } from "vitest";

import { compareTasks, computeStats, formatDueDate, matchesFilters, parseTaskFilters, type Task } from "@/lib/tasks";

function task(over: Partial<Task>): Task {
  return {
    id: crypto.randomUUID(),
    user_id: "u",
    title: "Tarea",
    description: null,
    priority: "medium",
    status: "pending",
    category_id: null,
    due_date: null,
    completed_at: null,
    created_at: "2026-11-01T10:00:00Z",
    updated_at: "2026-11-01T10:00:00Z",
    ...over,
  };
}

const TODAY = "2026-11-15";

describe("task rules", () => {
  it("counts high priority and overdue only among pending tasks", () => {
    const stats = computeStats(
      [
        task({ priority: "high" }),
        task({ priority: "high", status: "completed" }),
        task({ due_date: "2026-11-14" }),
        task({ due_date: "2026-11-14", status: "completed" }),
        task({ due_date: TODAY }),
      ],
      TODAY,
    );
    expect(stats).toEqual({ pending: 3, completed: 2, highPriority: 1, overdue: 1 });
  });

  it("drops invalid URL filter values", () => {
    expect(parseTaskFilters({ prio: "urgent", status: "pending", cat: "abc", q: "  " })).toEqual({});
    expect(parseTaskFilters({ prio: "high", status: "completed", cat: "none" })).toEqual({
      prio: "high",
      status: "completed",
      cat: "none",
    });
  });

  it("shows only pending tasks when no status is given", () => {
    expect(matchesFilters(task({ status: "completed" }), {})).toBe(false);
    expect(matchesFilters(task({ status: "completed" }), { status: "all" })).toBe(true);
  });

  it("searches title and description ignoring case and accents", () => {
    expect(matchesFilters(task({ title: "Llamar al Camión" }), { q: "camion" })).toBe(true);
    expect(matchesFilters(task({ description: "Revisar ÁRBOL" }), { q: "arbol" })).toBe(true);
    expect(matchesFilters(task({ title: "Otra" }), { q: "camion" })).toBe(false);
  });

  it("filters tasks without category with cat=none", () => {
    expect(matchesFilters(task({ category_id: null }), { cat: "none" })).toBe(true);
    expect(matchesFilters(task({ category_id: crypto.randomUUID() }), { cat: "none" })).toBe(false);
  });

  it("sorts by priority, then due date with no date last, then newest first", () => {
    const a = task({ title: "low", priority: "low", due_date: "2026-11-01" });
    const b = task({ title: "high-nodate", priority: "high" });
    const c = task({ title: "high-late", priority: "high", due_date: "2026-12-01" });
    const d = task({ title: "high-early", priority: "high", due_date: "2026-11-20" });
    const e = task({ title: "med-new", created_at: "2026-11-10T00:00:00Z" });
    const f = task({ title: "med-old", created_at: "2026-11-02T00:00:00Z" });
    const sorted = [a, b, c, d, e, f].sort(compareTasks).map((t) => t.title);
    expect(sorted).toEqual(["high-early", "high-late", "high-nodate", "med-new", "med-old", "low"]);
  });

  it("formats due dates as Hoy, Mañana or day + short month", () => {
    const now = new Date(2026, 10, 15, 9, 0);
    expect(formatDueDate("2026-11-15", now)).toBe("Hoy");
    expect(formatDueDate("2026-11-16", now)).toBe("Mañana");
    expect(formatDueDate("2026-11-20", now)).toBe("20 nov");
    expect(formatDueDate("2027-01-03", now)).toBe("3 ene 2027");
  });
});
