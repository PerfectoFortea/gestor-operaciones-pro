import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { RouteError, RouteNotFound } from "@/components/app/route-error";
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
import { Input } from "@/components/ui/input";
import {
  categoriesQuery,
  categoryErrorMessage,
  tasksQuery,
  useCreateCategory,
  useDeleteCategory,
  useRenameCategory,
} from "@/lib/queries";
import { sortCategories, type Category } from "@/lib/tasks";

export const Route = createFileRoute("/_authenticated/categories")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(categoriesQuery),
      context.queryClient.ensureQueryData(tasksQuery),
    ]);
  },
  head: () => ({
    meta: [
      { title: "Categorías · Gestor de Tareas Pro" },
      { name: "description", content: "Crea, renombra y borra las categorías de tus tareas." },
      { property: "og:title", content: "Categorías · Gestor de Tareas Pro" },
      { property: "og:description", content: "Crea, renombra y borra las categorías de tus tareas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CategoriesPage,
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
});

const nameSchema = z
  .string()
  .trim()
  .min(1, "Escribe un nombre")
  .max(50, "Máximo 50 caracteres");

function validateName(value: string): { ok: true; name: string } | { ok: false; error: string } {
  const parsed = nameSchema.safeParse(value);
  return parsed.success
    ? { ok: true, name: parsed.data }
    : { ok: false, error: parsed.error.issues[0]?.message ?? "Nombre no válido" };
}

function tasksLabel(n: number): string {
  return n === 1 ? "1 tarea" : `${n} tareas`;
}

function CategoriesPage() {
  const { data: rawCategories } = useSuspenseQuery(categoriesQuery);
  const { data: tasks } = useSuspenseQuery(tasksQuery);
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();

  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Category | null>(null);

  const categories = useMemo(() => sortCategories(rawCategories), [rawCategories]);
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tasks) if (t.category_id) map.set(t.category_id, (map.get(t.category_id) ?? 0) + 1);
    return map;
  }, [tasks]);
  const uncategorized = tasks.filter((t) => t.category_id === null).length;

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const result = validateName(newName);
    if (!result.ok) return setCreateError(result.error);
    setCreateError(null);
    try {
      await createCategory.mutateAsync(result.name);
      setNewName("");
    } catch (error) {
      setCreateError(categoryErrorMessage(error, "No se ha podido crear la categoría."));
    }
  }

  const deleteCount = toDelete ? (counts.get(toDelete.id) ?? 0) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Categorías</h1>
        <p className="text-sm text-muted-foreground">Organiza tus tareas en grupos.</p>
      </div>

      <form onSubmit={handleCreate} noValidate className="space-y-1.5">
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              if (createError) setCreateError(null);
            }}
            maxLength={50}
            placeholder="Nueva categoría"
            aria-label="Nombre de la nueva categoría"
            aria-invalid={Boolean(createError)}
          />
          <Button type="submit" disabled={createCategory.isPending}>
            <Plus className="h-4 w-4" aria-hidden />
            Añadir
          </Button>
        </div>
        {createError && <p className="text-xs font-medium">{createError}</p>}
      </form>

      {categories.length > 0 ? (
        <ul className="rounded-md border bg-card">
          {categories.map((c) => (
            <CategoryRow
              key={c.id}
              category={c}
              count={counts.get(c.id) ?? 0}
              onDelete={() => setToDelete(c)}
            />
          ))}
        </ul>
      ) : (
        <div className="rounded-md border border-dashed px-6 py-10 text-center">
          <p className="text-sm font-medium">Aún no tienes categorías</p>
          <p className="mt-1 text-sm text-muted-foreground">Escribe un nombre arriba para crear la primera.</p>
        </div>
      )}

      {uncategorized > 0 && (
        <p className="text-xs text-muted-foreground">Sin categoría: {tasksLabel(uncategorized)}</p>
      )}

      <AlertDialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar «{toDelete?.name}»?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteCount === 0
                ? "Esta categoría no tiene tareas."
                : `${tasksLabel(deleteCount)} ${deleteCount === 1 ? "quedará" : "quedarán"} sin categoría.`}{" "}
              Las tareas no se borran.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toDelete) deleteCategory.mutate(toDelete.id);
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

function CategoryRow({
  category,
  count,
  onDelete,
}: {
  category: Category;
  count: number;
  onDelete: () => void;
}) {
  const rename = useRenameCategory();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(category.name);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setValue(category.name);
    setError(null);
    setEditing(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    const result = validateName(value);
    if (!result.ok) return setError(result.error);
    if (result.name === category.name) return setEditing(false);
    setEditing(false);
    try {
      await rename.mutateAsync({ id: category.id, name: result.name });
    } catch (err) {
      toast.error(categoryErrorMessage(err, "No se ha podido renombrar la categoría."));
    }
  }

  if (editing) {
    return (
      <li className="border-b px-3 py-2 last:border-b-0">
        <form onSubmit={handleSave} noValidate className="flex items-center gap-2">
          <Input
            autoFocus
            value={value}
            maxLength={50}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
            aria-label="Nuevo nombre"
            aria-invalid={Boolean(error)}
            className="h-8"
          />
          <Button type="submit" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Guardar nombre">
            <Check className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setEditing(false)}
            aria-label="Cancelar"
          >
            <X className="h-4 w-4" />
          </Button>
        </form>
        {error && <p className="mt-1 text-xs font-medium">{error}</p>}
      </li>
    );
  }

  return (
    <li className="group flex items-center gap-3 border-b px-3 py-2.5 last:border-b-0 hover:bg-muted/50">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{category.name}</p>
        <p className="text-xs tabular-nums text-muted-foreground">{tasksLabel(count)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={startEdit} aria-label={`Renombrar ${category.name}`}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete} aria-label={`Borrar ${category.name}`}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}
