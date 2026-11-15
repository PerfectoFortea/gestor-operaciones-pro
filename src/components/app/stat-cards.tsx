import type { TaskStats } from "@/lib/tasks";

const ITEMS: { key: keyof TaskStats; label: string }[] = [
  { key: "pending", label: "Pendientes" },
  { key: "completed", label: "Completadas" },
  { key: "highPriority", label: "Alta prioridad" },
  { key: "overdue", label: "Vencidas" },
];

export function StatCards({ stats }: { stats: TaskStats }) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {ITEMS.map((item) => (
        <div key={item.key} className="rounded-md border bg-card px-4 py-3">
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{stats[item.key]}</dd>
        </div>
      ))}
    </dl>
  );
}
