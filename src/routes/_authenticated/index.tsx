import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/")({
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
});

function Dashboard() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-xl font-semibold">Panel de tareas</h1>
      <p className="mt-2 text-sm text-muted-foreground">Esta sección todavía está en construcción.</p>
    </div>
  );
}
