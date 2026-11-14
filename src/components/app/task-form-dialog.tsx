import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import type { TaskInput } from "@/lib/queries";
import { PRIORITY_LABEL, type Category, type Priority, type Task } from "@/lib/tasks";
import { cn } from "@/lib/utils";

// Radix Select cannot use value="": "none" stands for "Sin categoría" and is saved as null.
const NO_CATEGORY = "none";

const schema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "El título es obligatorio")
    .max(200, "Máximo 200 caracteres"),
  description: z.string().trim().max(5000, "Descripción demasiado larga"),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  categories: Category[];
  onSubmit: (input: TaskInput) => void;
}

export function TaskFormDialog({ open, onOpenChange, task, categories, onSubmit }: Props) {
  const isMobile = useIsMobile();
  const title = task ? "Editar tarea" : "Nueva tarea";
  const description = task ? "Cambia los datos de la tarea." : "Añade una tarea a tu lista.";
  const form = (
    <TaskForm
      key={task?.id ?? "new"}
      task={task}
      categories={categories}
      onCancel={() => onOpenChange(false)}
      onSubmit={(input) => {
        onSubmit(input);
        onOpenChange(false);
      }}
    />
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <div className="max-h-[75vh] overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {form}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {form}
      </DialogContent>
    </Dialog>
  );
}

function TaskForm({
  task,
  categories,
  onCancel,
  onSubmit,
}: {
  task: Task | null;
  categories: Category[];
  onCancel: () => void;
  onSubmit: (input: TaskInput) => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "medium");
  const [categoryId, setCategoryId] = useState<string>(task?.category_id ?? NO_CATEGORY);
  const [dueDate, setDueDate] = useState<string | null>(task?.due_date ?? null);
  const [dateOpen, setDateOpen] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; description?: string }>({});

  // If the selected category disappears (deleted elsewhere), fall back to none.
  useEffect(() => {
    if (categoryId !== NO_CATEGORY && !categories.some((c) => c.id === categoryId)) {
      setCategoryId(NO_CATEGORY);
    }
  }, [categories, categoryId]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ title, description });
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as "title" | "description";
        next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    onSubmit({
      title: parsed.data.title,
      description: parsed.data.description === "" ? null : parsed.data.description,
      priority,
      category_id: categoryId === NO_CATEGORY ? null : categoryId,
      due_date: dueDate,
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="task-title">Título *</Label>
        <Input
          id="task-title"
          autoFocus
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="¿Qué tienes que hacer?"
          aria-invalid={Boolean(errors.title)}
        />
        {errors.title && <p className="text-xs font-medium">{errors.title}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="task-description">Descripción</Label>
        <Textarea
          id="task-description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detalles opcionales"
        />
        {errors.description && <p className="text-xs font-medium">{errors.description}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="task-priority">Prioridad</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
            <SelectTrigger id="task-priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["low", "medium", "high"] as Priority[]).map((p) => (
                <SelectItem key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="task-category">Categoría</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger id="task-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_CATEGORY}>Sin categoría</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="task-due">Fecha de vencimiento</Label>
        <div className="flex gap-2">
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <Button
                id="task-due"
                type="button"
                variant="outline"
                className={cn(
                  "flex-1 justify-start font-normal",
                  !dueDate && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" aria-hidden />
                {dueDate
                  ? format(parseISO(dueDate), "EEEE, d 'de' MMMM yyyy", { locale: es })
                  : "Sin fecha"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                locale={es}
                weekStartsOn={1}
                selected={dueDate ? parseISO(dueDate) : undefined}
                {...(dueDate ? { defaultMonth: parseISO(dueDate) } : {})}
                onSelect={(d) => {
                  setDueDate(d ? format(d, "yyyy-MM-dd") : null);
                  setDateOpen(false);
                }}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          {dueDate && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setDueDate(null)}
              aria-label="Quitar fecha"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Guardar</Button>
      </div>
    </form>
  );
}
