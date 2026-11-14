import { Link, Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { CheckSquare, FolderOpen, ListTodo, UserRound } from "lucide-react";

import { AppSkeleton } from "@/components/app/app-skeleton";
import { getSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

// Session lives in browser storage, so the gate runs client-side only.
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) throw redirect({ to: "/auth", replace: true });
    return { user: session.user };
  },
  pendingComponent: AppSkeleton,
  pendingMs: 0,
  component: AppLayout,
});

const NAV = [
  { to: "/", label: "Tareas", icon: ListTodo },
  { to: "/categories", label: "Categorías", icon: FolderOpen },
  { to: "/profile", label: "Perfil", icon: UserRound },
] as const;

function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" aria-hidden />
            <span className="text-sm font-semibold tracking-tight">Gestor de Tareas Pro</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: true, includeSearch: false }}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                activeProps={{ className: "bg-accent text-foreground font-medium" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 md:pb-12">
        <Outlet />
      </main>

      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <div className="grid h-16 grid-cols-3">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: true, includeSearch: false }}
              className="flex flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground"
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn("h-5 w-5", isActive && "text-foreground")} aria-hidden />
                  <span className={cn(isActive && "font-medium text-foreground")}>{item.label}</span>
                </>
              )}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
