import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Listener = (event: AuthChangeEvent, session: Session | null) => void;

let currentSession: Session | null = null;
let ready: Promise<void> | null = null;
const listeners = new Set<Listener>();

/**
 * Browser-only. Registers onAuthStateChange BEFORE reading the stored session,
 * so no auth event is missed between the two calls.
 */
export function initAuth(): Promise<void> {
  if (ready) return ready;
  ready = new Promise<void>((resolve) => {
    supabase.auth.onAuthStateChange((event, session) => {
      currentSession = session;
      // Defer so listeners never call Supabase inside the auth callback (deadlock risk).
      setTimeout(() => listeners.forEach((l) => l(event, session)), 0);
    });
    supabase.auth
      .getSession()
      .then(({ data }) => {
        currentSession = data.session;
      })
      .finally(() => resolve());
  });
  return ready;
}

export async function getSession(): Promise<Session | null> {
  await initAuth();
  return currentSession;
}

export function onAuthChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Spanish messages for the auth errors users actually hit. */
export function authErrorMessage(error: { message?: string; code?: string }): string {
  const code = error.code ?? "";
  const msg = (error.message ?? "").toLowerCase();
  if (code === "invalid_credentials" || msg.includes("invalid login credentials")) {
    return "Email o contraseña incorrectos.";
  }
  if (code === "user_already_exists" || code === "email_exists" || msg.includes("already registered")) {
    return "Ese email ya está registrado. Inicia sesión.";
  }
  if (code === "weak_password" || msg.includes("password should be")) {
    return "La contraseña es demasiado débil. Usa al menos 6 caracteres.";
  }
  if (code === "email_not_confirmed") return "Tienes que confirmar tu email antes de entrar.";
  if (code === "over_request_rate_limit" || msg.includes("rate limit")) {
    return "Demasiados intentos. Espera un momento y vuelve a probar.";
  }
  if (code === "email_address_invalid") return "Ese email no es válido.";
  return "No se ha podido completar la operación. Inténtalo de nuevo.";
}
