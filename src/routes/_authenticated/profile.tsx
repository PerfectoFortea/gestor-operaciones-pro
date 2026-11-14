import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Perfil · Gestor de Tareas Pro" },
      { name: "description", content: "Tu nombre, tu email y el cierre de sesión." },
      { property: "og:title", content: "Perfil · Gestor de Tareas Pro" },
      { property: "og:description", content: "Tu nombre, tu email y el cierre de sesión." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const name = (user.user_metadata as { full_name?: string } | undefined)?.full_name;

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">Perfil</h1>
      <dl className="divide-y rounded-md border">
        <div className="flex justify-between gap-4 px-4 py-3 text-sm">
          <dt className="text-muted-foreground">Nombre</dt>
          <dd className="font-medium">{name || "—"}</dd>
        </div>
        <div className="flex justify-between gap-4 px-4 py-3 text-sm">
          <dt className="text-muted-foreground">Email</dt>
          <dd className="break-all font-medium">{user.email}</dd>
        </div>
      </dl>
      <Button variant="outline" onClick={signOut}>
        Cerrar sesión
      </Button>
    </div>
  );
}
