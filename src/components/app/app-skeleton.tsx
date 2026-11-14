import { Skeleton } from "@/components/ui/skeleton";

export function AppSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8" aria-busy="true" aria-label="Cargando">
      <Skeleton className="h-7 w-48" />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="mt-6 h-9 w-full" />
      <div className="mt-6 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    </div>
  );
}
