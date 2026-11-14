import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/categories")({
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
});

function CategoriesPage() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-xl font-semibold">Categorías</h1>
      <p className="mt-2 text-sm text-muted-foreground">Esta sección todavía está en construcción.</p>
    </div>
  );
}
