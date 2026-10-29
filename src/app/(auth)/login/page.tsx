"use client";

import { useActionState, useState, useEffect, useRef, startTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import type { Resolver } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { loginAction } from "@/modules/auth/actions";
import { loginSchema } from "@/modules/auth/schemas";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { AuthShell } from "@/components/shared/AuthShell";

const REMEMBER_KEY = "sl_remember_email";

type ActionState = { error?: string; needsConfirmation?: boolean } | null;
type FormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    loginAction as never,
    null
  );
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(loginSchema) as Resolver<FormValues>,
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setValue("email", saved);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRememberMe(true);
    }
  }, [setValue]);

  // eslint-disable-next-line react-hooks/refs
  const onSubmit = handleSubmit((values) => {
    if (rememberMe && values.email) {
      localStorage.setItem(REMEMBER_KEY, values.email);
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }
    startTransition(() => {
      formAction(new FormData(formRef.current!));
    });
  });

  return (
    <AuthShell>
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-700 mb-3">Bienvenido/a</p>
        <h2 id="login-title" className="text-3xl text-slate-900">Iniciá sesión</h2>
        <p className="text-sm text-slate-500 mt-2">Ingresá con el email que te dio el instituto.</p>
      </div>

      {state?.needsConfirmation && (
        <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-sm font-semibold text-amber-800 mb-1">Confirmá tu email</p>
          <p className="text-xs text-amber-700">
            Te enviamos un email de confirmación. Revisá tu bandeja de
            entrada (y spam) y hacé clic en el link antes de ingresar.
          </p>
        </div>
      )}

      {state?.error && !state.needsConfirmation && (
        <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-700">{state.error}</p>
        </div>
      )}

      <form ref={formRef} onSubmit={onSubmit} className="space-y-5" aria-labelledby="login-title">
        <Field label="Email" required id="email" error={errors.email?.message}>
          <Input
            id="email"
            type="text"
            inputMode="email"
            autoComplete="email"
            autoFocus
            placeholder="tu@email.com"
            disabled={pending}
            {...register("email")}
          />
        </Field>

        <Field label="Contraseña" required id="password" error={errors.password?.message}>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              disabled={pending}
              className="pr-10"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPassword
                ? <EyeOff className="w-4 h-4" />
                : <Eye className="w-4 h-4" />
              }
            </button>
          </div>
        </Field>

        <div className="flex items-center justify-between gap-3 -mt-1">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 accent-brand-700"
            />
            <span className="text-sm text-slate-600">Recordarme</span>
          </label>
          <Link href="/forgot-password" className="text-xs font-medium text-brand-700 hover:underline underline-offset-2">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

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
    </AuthShell>
  );
}
