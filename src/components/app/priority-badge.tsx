import { PRIORITY_LABEL, type Priority } from "@/lib/tasks";
import { cn } from "@/lib/utils";

const STYLES: Record<Priority, string> = {
  high: "bg-priority-high-soft text-priority-high",
  medium: "bg-priority-medium-soft text-priority-medium",
  low: "bg-priority-low-soft text-priority-low",
};

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-none",
        STYLES[priority],
        className,
      )}
    >
      {PRIORITY_LABEL[priority]}
    </span>
  );
}
