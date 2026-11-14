import { AlertCircle, CalendarDays, Pencil, Trash2 } from "lucide-react";

import { PriorityBadge } from "@/components/app/priority-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDueDate, isOverdue, type Task } from "@/lib/tasks";
import { cn } from "@/lib/utils";

interface Props {
  task: Task;
  categoryName: string | null;
  today: string;
  leaving: boolean;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function TaskItem({ task, categoryName, today, leaving, onToggle, onEdit, onDelete }: Props) {
  const done = task.status === "completed";
  const overdue = isOverdue(task, today);
  const checkboxId = `task-${task.id}`;

  return (
    <li
      className={cn(
        "group flex items-start gap-3 border-b px-1 py-3 transition-colors last:border-b-0 hover:bg-muted/50",
        leaving && "pointer-events-none animate-out fade-out-0 slide-out-to-right-4 fill-mode-forwards duration-500",
      )}
    >
      <Checkbox
        id={checkboxId}
        checked={done}
        onCheckedChange={() => onToggle(task)}
        className="mt-0.5 h-[18px] w-[18px]"
        aria-label={done ? "Marcar como pendiente" : "Marcar como completada"}
      />
      <div className="min-w-0 flex-1">
        <label
          htmlFor={checkboxId}
          className={cn(
            "block cursor-pointer break-words text-sm font-medium transition-colors duration-300",
            done && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </label>
        {task.description && (
          <p className="mt-0.5 line-clamp-2 break-words text-xs text-muted-foreground">
            {task.description}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <PriorityBadge priority={task.priority} />
          {categoryName && <span>{categoryName}</span>}
          {task.due_date && (
            <span
              className={cn(
                "inline-flex items-center gap-1",
                overdue && "font-semibold text-foreground",
              )}
            >
              {overdue ? (
                <AlertCircle className="h-3.5 w-3.5" aria-label="Vencida" />
              ) : (
                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
              )}
              {formatDueDate(task.due_date)}
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(task)} aria-label="Editar tarea">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(task)} aria-label="Borrar tarea">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}
