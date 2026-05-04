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
          <div className="inline-flex items-center gap-2.5 mb-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" }}
            >
              <svg width="19" height="19" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polygon points="10,2 18,6.5 10,11 2,6.5" fill="white"/>
                <path d="M4 8v3.5C4 14.5 7 16 10 16s6-1.5 6-4.5V8Z" fill="white" fillOpacity="0.3"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Smart Learning</h1>
          </div>
          <p className="text-sm text-slate-500">Sistema de Gestión Académica</p>
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

          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          © Smart Learning {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
