import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Category, Priority, Profile, Task, TaskStatus } from "@/lib/tasks";

// RLS scopes every read to the signed-in user: never filter by user_id here.

export const tasksQuery = queryOptions({
  queryKey: ["tasks"],
  queryFn: async (): Promise<Task[]> => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("priority", { ascending: false })
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: async (): Promise<Category[]> => {
    const { data, error } = await supabase.from("categories").select("*").order("name");
    if (error) throw error;
    return data;
  },
});

export const profileQuery = queryOptions({
  queryKey: ["profile"],
  queryFn: async (): Promise<Profile | null> => {
    const { data, error } = await supabase.from("profiles").select("*").maybeSingle();
    if (error) throw error;
    return data;
  },
});

export interface TaskInput {
  title: string;
  description: string | null;
  priority: Priority;
  category_id: string | null;
  due_date: string | null;
}

type Snapshot<T> = { previous: T | undefined };

function useTaskCache() {
  const qc = useQueryClient();
  async function snapshot(): Promise<Snapshot<Task[]>> {
    await qc.cancelQueries({ queryKey: ["tasks"] });
    return { previous: qc.getQueryData<Task[]>(["tasks"]) };
  }
  function set(updater: (tasks: Task[]) => Task[]) {
    qc.setQueryData<Task[]>(["tasks"], (old) => updater(old ?? []));
  }
  function rollback(ctx: Snapshot<Task[]> | undefined, message: string) {
    if (ctx) qc.setQueryData(["tasks"], ctx.previous);
    toast.error(message);
  }
  function settle() {
    return qc.invalidateQueries({ queryKey: ["tasks"] });
  }
  return { snapshot, set, rollback, settle };
}

export function useCreateTask() {
  const cache = useTaskCache();
  return useMutation({
    mutationFn: async (task: Task) => {
      const { error } = await supabase.from("tasks").insert({
        id: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        category_id: task.category_id,
        due_date: task.due_date,
      });
      if (error) throw error;
    },
    onMutate: async (task) => {
      const ctx = await cache.snapshot();
      cache.set((tasks) => [task, ...tasks]);
      return ctx;
    },
    onError: (_e, _v, ctx) => cache.rollback(ctx, "No se ha podido crear la tarea."),
    onSettled: cache.settle,
  });
}

/** Builds the optimistic row for a new task; the id is generated client-side. */
export function newTaskFromInput(input: TaskInput): Task {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    user_id: "",
    status: "pending",
    completed_at: null,
    created_at: now,
    updated_at: now,
    ...input,
  };
}

export function useUpdateTask() {
  const cache = useTaskCache();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: TaskInput }) => {
      const { error } = await supabase.from("tasks").update(input).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, input }) => {
      const ctx = await cache.snapshot();
      cache.set((tasks) => tasks.map((t) => (t.id === id ? { ...t, ...input } : t)));
      return ctx;
    },
    onError: (_e, _v, ctx) => cache.rollback(ctx, "No se han podido guardar los cambios."),
    onSettled: cache.settle,
  });
}

export function useToggleTask() {
  const cache = useTaskCache();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, status }) => {
      const ctx = await cache.snapshot();
      cache.set((tasks) =>
        tasks.map((t) =>
          t.id === id
            ? { ...t, status, completed_at: status === "completed" ? new Date().toISOString() : null }
            : t,
        ),
      );
      return ctx;
    },
    onError: (_e, _v, ctx) => cache.rollback(ctx, "No se ha podido actualizar la tarea."),
    onSettled: cache.settle,
  });
}

export function useDeleteTask() {
  const cache = useTaskCache();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      const ctx = await cache.snapshot();
      cache.set((tasks) => tasks.filter((t) => t.id !== id));
      return ctx;
    },
    onError: (_e, _v, ctx) => cache.rollback(ctx, "No se ha podido borrar la tarea."),
    onSettled: cache.settle,
  });
}

// ---------- Categories ----------

export function categoryErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "code" in error && error.code === "23505") {
    return "Ya tienes una categoría con ese nombre";
  }
  return fallback;
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("categories").insert({ id: crypto.randomUUID(), name });
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useRenameCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("categories").update({ name }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, name }) => {
      await qc.cancelQueries({ queryKey: ["categories"] });
      const previous = qc.getQueryData<Category[]>(["categories"]);
      qc.setQueryData<Category[]>(["categories"], (old) =>
        (old ?? []).map((c) => (c.id === id ? { ...c, name } : c)),
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(["categories"], ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: ["categories"] }),
        qc.cancelQueries({ queryKey: ["tasks"] }),
      ]);
      const previous = {
        categories: qc.getQueryData<Category[]>(["categories"]),
        tasks: qc.getQueryData<Task[]>(["tasks"]),
      };
      qc.setQueryData<Category[]>(["categories"], (old) => (old ?? []).filter((c) => c.id !== id));
      // Tasks are kept: the database sets their category to null (ON DELETE SET NULL).
      qc.setQueryData<Task[]>(["tasks"], (old) =>
        (old ?? []).map((t) => (t.category_id === id ? { ...t, category_id: null } : t)),
      );
      return previous;
    },
    onError: (_e, _v, ctx) => {
      if (ctx) {
        qc.setQueryData(["categories"], ctx.categories);
        qc.setQueryData(["tasks"], ctx.tasks);
      }
      toast.error("No se ha podido borrar la categoría.");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
