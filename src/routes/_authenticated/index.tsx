import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FilterChip } from "@/components/app/filter-chip";
import { RouteError, RouteNotFound } from "@/components/app/route-error";
import { SearchBox } from "@/components/app/search-box";
import { StatCards } from "@/components/app/stat-cards";
import { TaskFormDialog } from "@/components/app/task-form-dialog";
import { TaskItem } from "@/components/app/task-item";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  categoriesQuery,
  newTaskFromInput,
  profileQuery,
  tasksQuery,
  useCreateTask,
  useDeleteTask,
  useToggleTask,
  useUpdateTask,
  type TaskInput,
} from "@/lib/queries";
import {
  PRIORITIES,
  PRIORITY_LABEL,
  compareTasks,
  computeStats,
  hasActiveFilters,
  matchesFilters,
  parseTaskFilters,
  sortCategories,
  todayKey,
  type Task,
  type TaskFilters,
} from "@/lib/tasks";

export const Route = createFileRoute("/_authenticated/")({
  validateSearch: (search: Record<string, unknown>): TaskFilters => parseTaskFilters(search),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(tasksQuery),
      context.queryClient.ensureQueryData(categoriesQuery),
      context.queryClient.ensureQueryData(profileQuery),
    ]);
  },
  head: () => ({
    meta: [
      { title: "Mis tareas · Gestor de Tareas Pro" },
      { name: "description", content: "Tus tareas pendientes, ordenadas por prioridad y fecha." },
      { property: "og:title", content: "Mis tareas · Gestor de Tareas Pro" },
      { property: "og:description", content: "Tus tareas pendientes, ordenadas por prioridad y fecha." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
});

const STATUS_OPTIONS = [
  { value: "pending", label: "Pendientes" },
  { value: "completed", label: "Completadas" },
  { value: "all", label: "Todas" },
] as const;

const LEAVE_MS = 500;

/** A filter change; `undefined` clears that filter. */
type FilterPatch = { [K in keyof TaskFilters]?: TaskFilters[K] | undefined };

/** Drops cleared keys so the URL only keeps active filters. */
function withoutEmpty(search: FilterPatch): TaskFilters {
  const out: TaskFilters = {};
  if (search.q) out.q = search.q;
  if (search.cat) out.cat = search.cat;
  if (search.prio) out.prio = search.prio;
  if (search.status) out.status = search.status;
  return out;
}

function Dashboard() {
  const filters = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const { user } = Route.useRouteContext();

  const { data: tasks } = useSuspenseQuery(tasksQuery);
  const { data: rawCategories } = useSuspenseQuery(categoriesQuery);
  const { data: profile } = useSuspenseQuery(profileQuery);

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const toggleTask = useToggleTask();
  const deleteTask = useDeleteTask();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [toDelete, setToDelete] = useState<Task | null>(null);
  // Tasks that just stopped matching the filters stay visible briefly to animate out.
  const [leaving, setLeaving] = useState<Set<string>>(() => new Set());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach(clearTimeout);
  }, []);

  const today = todayKey();
  const categories = useMemo(() => sortCategories(rawCategories), [rawCategories]);
  const categoryName = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories],
  );
  const stats = useMemo(() => computeStats(tasks, today), [tasks, today]);
  const visible = useMemo(
    () => tasks.filter((t) => matchesFilters(t, filters) || leaving.has(t.id)).sort(compareTasks),
    [tasks, filters, leaving],
  );

  const name =
    profile?.full_name?.trim() ||
    (user.user_metadata as { full_name?: string } | undefined)?.full_name?.trim() ||
    "";
  const firstName = name.split(/\s+/)[0];

  const setFilter = useCallback(
    (patch: FilterPatch) =>
      navigate({ search: (prev) => withoutEmpty({ ...prev, ...patch }), replace: true }),
    [navigate],
  );
  const onSearch = useCallback((q: string | undefined) => setFilter({ q }), [setFilter]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function handleSubmit(input: TaskInput) {
    if (editing) updateTask.mutate({ id: editing.id, input });
    else createTask.mutate(newTaskFromInput(input));
  }

  function handleToggle(task: Task) {
    const status = task.status === "completed" ? "pending" : "completed";
    if (!matchesFilters({ ...task, status }, filters)) {
      setLeaving((s) => new Set(s).add(task.id));
      const previous = timers.current.get(task.id);
      if (previous) clearTimeout(previous);
      timers.current.set(
        task.id,
        setTimeout(() => {
          timers.current.delete(task.id);
          setLeaving((s) => {
            const next = new Set(s);
            next.delete(task.id);
            return next;
          });
        }, LEAVE_MS),
      );
    }
    toggleTask.mutate({ id: task.id, status });
  }

  const active = hasActiveFilters(filters);
  const status = filters.status ?? "pending";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight">
            {firstName ? `Hola, ${firstName}` : "Hola"}
          </h1>
          <p className="text-sm text-muted-foreground">Esto es lo que tienes pendiente.</p>
        </div>
        <Button onClick={openCreate} className="hidden md:inline-flex">
          <Plus className="h-4 w-4" aria-hidden />
          Nueva tarea
        </Button>
      </div>

      <StatCards stats={stats} />

      {categories.length === 0 && (
        <div className="rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
          Aún no tienes categorías.{" "}
          <Link to="/categories" className="font-medium text-foreground underline underline-offset-4">
            Crea una en Categorías
          </Link>{" "}
          para organizar tus tareas.
        </div>
      )}

      <section className="space-y-3" aria-label="Filtros">
        <SearchBox value={filters.q} onChange={onSearch} />

        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Categoría">
          <FilterChip active={!filters.cat} onClick={() => setFilter({ cat: undefined })}>
            Todas
          </FilterChip>
          {categories.map((c) => (
            <FilterChip key={c.id} active={filters.cat === c.id} onClick={() => setFilter({ cat: c.id })}>
              {c.name}
            </FilterChip>
          ))}
          <FilterChip active={filters.cat === "none"} onClick={() => setFilter({ cat: "none" })}>
            Sin categoría
          </FilterChip>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1.5" role="group" aria-label="Prioridad">
            <FilterChip active={!filters.prio} onClick={() => setFilter({ prio: undefined })}>
              Todas
            </FilterChip>
            {PRIORITIES.map((p) => (
              <FilterChip key={p} active={filters.prio === p} onClick={() => setFilter({ prio: p })}>
                {PRIORITY_LABEL[p]}
              </FilterChip>
            ))}
          </div>
          <Tabs
            value={status}
            onValueChange={(v) => setFilter({ status: v === "pending" ? undefined : (v as "all" | "completed") })}
          >
            <TabsList className="h-8">
              {STATUS_OPTIONS.map((o) => (
                <TabsTrigger key={o.value} value={o.value} className="px-2.5 py-1 text-xs">
                  {o.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {active && (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 h-7 px-2 text-xs"
            onClick={() => navigate({ search: {}, replace: true })}
          >
            Limpiar filtros
          </Button>
        )}
      </section>

      {visible.length > 0 ? (
        <ul className="rounded-md border bg-card px-3">
          {visible.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              categoryName={task.category_id ? (categoryName.get(task.category_id) ?? null) : null}
              today={today}
              leaving={leaving.has(task.id)}
              onToggle={handleToggle}
              onEdit={(t) => {
                setEditing(t);
                setFormOpen(true);
              }}
              onDelete={setToDelete}
            />
          ))}
        </ul>
      ) : (
        <EmptyState
          noTasks={tasks.length === 0}
          filtered={active}
          onCreate={openCreate}
          onClear={() => navigate({ search: {}, replace: true })}
        />
      )}

      <Button
        onClick={openCreate}
        size="icon"
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 h-14 w-14 rounded-full shadow-lg md:hidden"
        aria-label="Nueva tarea"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <TaskFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        task={editing}
        categories={categories}
        onSubmit={handleSubmit}
      />

      <AlertDialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar esta tarea?</AlertDialogTitle>
            <AlertDialogDescription>
              «{toDelete?.title}» se borrará para siempre. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toDelete) deleteTask.mutate(toDelete.id);
                setToDelete(null);
              }}
            >
              Borrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmptyState({
  noTasks,
  filtered,
  onCreate,
  onClear,
}: {
  noTasks: boolean;
  filtered: boolean;
  onCreate: () => void;
  onClear: () => void;
}) {
  const title = noTasks
    ? "Aún no tienes tareas"
    : filtered
      ? "Ninguna tarea coincide con los filtros"
      : "No tienes tareas pendientes";
  const text = noTasks
    ? "Crea tu primera tarea para empezar a organizarte."
    : filtered
      ? "Prueba con otra búsqueda o limpia los filtros."
      : "¡Todo al día! Añade una tarea nueva cuando la necesites.";
  return (
    <div className="rounded-md border border-dashed px-6 py-12 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {filtered && !noTasks && (
          <Button variant="outline" onClick={onClear}>
            Limpiar filtros
          </Button>
        )}
        <Button onClick={onCreate}>
          <Plus className="h-4 w-4" aria-hidden />
          Nueva tarea
        </Button>
      </div>
    </div>
  );
}
