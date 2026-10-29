"use client";

import { useActionState, useRef, startTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Resolver } from "react-hook-form";
import Link from "next/link";
import { ArrowLeft, MailCheck } from "lucide-react";
import { forgotPasswordAction } from "@/modules/auth/actions";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { AuthShell } from "@/components/shared/AuthShell";

const forgotPasswordSchema = z.object({
  email: z.email("Email inválido"),
});
type FormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(forgotPasswordSchema) as Resolver<FormValues>,
    defaultValues: { email: "" },
  });
  // eslint-disable-next-line react-hooks/refs
  const onSubmit = handleSubmit(() => {
    startTransition(() => {
      formAction(new FormData(formRef.current!));
    });
  });

  return (
    <AuthShell>
      {state?.success ? (
        <div className="text-center py-2">
          <div className="w-12 h-12 rounded-full bg-emerald-50 ring-1 ring-emerald-200 flex items-center justify-center mx-auto mb-5">
            <MailCheck className="w-6 h-6 text-emerald-700" strokeWidth={1.75} />
          </div>
          <h2 className="text-2xl text-slate-900 mb-2">Revisá tu email</h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Si ese email está registrado en el sistema, vas a recibir un link para restablecer tu contraseña en los próximos minutos.
          </p>
          <Link href="/login" className="text-sm text-brand-700 hover:underline font-medium">
            Volver al login
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-700 mb-3">Recuperar acceso</p>
            <h2 className="text-3xl text-slate-900">Olvidé mi contraseña</h2>
            <p className="text-sm text-slate-500 mt-2">
              Ingresá tu email y te enviamos un link para crear una nueva contraseña.
            </p>
          </div>

          {state?.error && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-700">{state.error}</p>
            </div>
          )}

          <form ref={formRef} onSubmit={onSubmit} className="space-y-5">
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

            <Button type="submit" fullWidth size="lg" loading={pending}>
              {pending ? "Enviando..." : "Enviar link de recuperación"}
            </Button>
          </form>

          <div className="mt-8 pt-5 border-t border-slate-200">
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Volver al login
            </Link>
          </div>
        </>
      )}
    </AuthShell>
  );
}
