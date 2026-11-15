import { useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { useQueryErrorResetBoundary } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";

export function RouteError(_props: ErrorComponentProps) {
  const router = useRouter();
  const { reset } = useQueryErrorResetBoundary();
  return (
    <div role="alert" className="py-16 text-center">
      <h1 className="text-lg font-semibold">No se han podido cargar tus datos</h1>
      <p className="mt-2 text-sm text-muted-foreground">Comprueba tu conexión y vuelve a intentarlo.</p>
      <Button
        className="mt-6"
        onClick={() => {
          reset();
          void router.invalidate();
        }}
      >
        Reintentar
      </Button>
    </div>
  );
}

export function RouteNotFound() {
  return <p className="py-16 text-center text-sm text-muted-foreground">No se ha encontrado esta página.</p>;
}
