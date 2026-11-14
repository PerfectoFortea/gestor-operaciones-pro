import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { CheckSquare } from "lucide-react";
import { useState, type FormEvent } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage, getSession } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    if (await getSession()) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Entrar · Gestor de Tareas Pro" },
      { name: "description", content: "Inicia sesión o crea tu cuenta en Gestor de Tareas Pro." },
      { property: "og:title", content: "Entrar · Gestor de Tareas Pro" },
      { property: "og:description", content: "Inicia sesión o crea tu cuenta en Gestor de Tareas Pro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Introduce un email válido");
const passwordSchema = z.string().min(6, "La contraseña debe tener al menos 6 caracteres");
const signInSchema = z.object({ email: emailSchema, password: passwordSchema });
const signUpSchema = signInSchema.extend({
  fullName: z.string().trim().min(1, "Escribe tu nombre completo").max(100, "Nombre demasiado largo"),
});

type Errors = Partial<Record<"fullName" | "email" | "password" | "form", string>>;

function AuthPage() {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2">
          <CheckSquare className="h-5 w-5" aria-hidden />
          <span className="text-sm font-semibold tracking-tight">Gestor de Tareas Pro</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {tab === "signin" ? "Bienvenido de nuevo" : "Crea tu cuenta"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {tab === "signin" ? "Entra para ver tus tareas." : "Empieza a organizar tu día en segundos."}
        </p>
        <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")} className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Iniciar sesión</TabsTrigger>
            <TabsTrigger value="signup">Registrarse</TabsTrigger>
          </TabsList>
          <TabsContent value="signin" className="mt-6">
            <AuthForm mode="signin" />
          </TabsContent>
          <TabsContent value="signup" className="mt-6">
            <AuthForm mode="signup" />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setNotice(null);
    const parsed =
      mode === "signup"
        ? signUpSchema.safeParse({ fullName, email, password })
        : signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof Errors;
        next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      if (mode === "signup") {
        const data = parsed.data as z.infer<typeof signUpSchema>;
        const { data: res, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: { data: { full_name: data.fullName }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        // Supabase hides existing emails by returning a user with no identities.
        if (res.user && res.user.identities?.length === 0) {
          setErrors({ form: "Ese email ya está registrado. Inicia sesión." });
          return;
        }
        if (!res.session) {
          setNotice("Te hemos enviado un email para confirmar tu cuenta.");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
      }
      await navigate({ to: "/", replace: true });
    } catch (err) {
      setErrors({ form: authErrorMessage(err as { message?: string; code?: string }) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {mode === "signup" && (
        <Field id={`${mode}-name`} label="Nombre completo" error={errors.fullName}>
          <Input
            id={`${mode}-name`}
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            aria-invalid={Boolean(errors.fullName)}
          />
        </Field>
      )}
      <Field id={`${mode}-email`} label="Email" error={errors.email}>
        <Input
          id={`${mode}-email`}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(errors.email)}
        />
      </Field>
      <Field id={`${mode}-password`} label="Contraseña" error={errors.password}>
        <Input
          id={`${mode}-password`}
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={Boolean(errors.password)}
        />
      </Field>
      {errors.form && (
        <p role="alert" className="rounded-md border bg-muted px-3 py-2 text-sm">
          {errors.form}
        </p>
      )}
      {notice && <p className="rounded-md border bg-muted px-3 py-2 text-sm">{notice}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Un momento…" : mode === "signin" ? "Iniciar sesión" : "Crear cuenta"}
      </Button>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-xs font-medium text-foreground">{error}</p>}
    </div>
  );
}
