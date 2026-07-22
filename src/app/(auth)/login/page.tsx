"use client";

import { useActionState, useState, useEffect, useRef } from "react";
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

const REMEMBER_KEY = "sl_remember_email";

const inputBase =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-700 disabled:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";

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
      setRememberMe(true);
    }
  }, [setValue]);

  const onSubmit = handleSubmit((values) => {
    if (rememberMe && values.email) {
      localStorage.setItem(REMEMBER_KEY, values.email);
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }
    formAction(new FormData(formRef.current!));
  });

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

          {state?.needsConfirmation && (
            <div className="mb-5 p-4 rounded-xl bg-warning-50 border border-amber-200">
              <p className="text-sm font-semibold text-amber-800 mb-1">Confirmá tu email</p>
              <p className="text-xs text-amber-700">
                Te enviamos un email de confirmación. Revisá tu bandeja de
                entrada (y spam) y hacé clic en el link antes de ingresar.
              </p>
            </div>
          )}

          {state?.error && !state.needsConfirmation && (
            <div className="mb-5 p-3 rounded-lg bg-danger-50 border border-red-200">
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

            {/* Password with eye toggle */}
            <Field label="Contraseña" required id="password" error={errors.password?.message}>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  disabled={pending}
                  className={`${inputBase} pr-10`}
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

            {/* Forgot password */}
            <div className="text-right -mt-1">
              <Link href="/forgot-password" className="text-xs text-brand-700 hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-brand-700 accent-blue-700"
              />
              <span className="text-sm text-slate-600">Recordarme</span>
            </label>

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
