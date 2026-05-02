"use client";

import { useActionState } from "react";
import { loginAction } from "@/modules/auth/actions";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";

type ActionState = { error?: string; needsConfirmation?: boolean } | null;

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    loginAction as never,
    null
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-[480px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-700 tracking-tight">IICANA</h1>
          <p className="text-sm text-slate-500 mt-1">Sistema de Gestión Académica</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Iniciá sesión</h2>

          {/* Email not confirmed */}
          {state?.needsConfirmation && (
            <div className="mb-5 p-4 rounded-xl bg-warning-50 border border-amber-200">
              <p className="text-sm font-semibold text-amber-800 mb-1">
                Confirmá tu email
              </p>
              <p className="text-xs text-amber-700">
                Te enviamos un email de confirmación. Revisá tu bandeja de
                entrada (y spam) y hacé clic en el link antes de ingresar.
              </p>
            </div>
          )}

          {/* Generic error */}
          {state?.error && !state.needsConfirmation && (
            <div className="mb-5 p-3 rounded-lg bg-danger-50 border border-red-200">
              <p className="text-sm text-red-700">{state.error}</p>
            </div>
          )}

          <form action={formAction} className="space-y-5" aria-labelledby="login-title">
            <Field label="Email" required id="email">
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                autoFocus
                placeholder="tu@email.com"
                disabled={pending}
              />
            </Field>

            <Field label="Contraseña" required id="password">
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                disabled={pending}
              />
            </Field>

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={pending}
              className="mt-2"
            >
              {pending ? "Ingresando..." : "Ingresar"}
            </Button>

            <p className="text-center text-sm text-slate-500">
              ¿No tenés cuenta?{" "}
              <a href="/register" className="text-brand-700 hover:underline font-medium">
                Registrarse
              </a>
            </p>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          © IICANA Pueyrredón {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
