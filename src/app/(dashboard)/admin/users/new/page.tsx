"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createAdministrativoAction } from "@/modules/users/actions";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function NewAdministrativoPage() {
  const [state, action, pending] = useActionState(createAdministrativoAction, undefined);

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/users"
          className="text-sm text-slate-400 hover:text-slate-600 inline-flex items-center gap-1 mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Usuarios
        </Link>
        <h2 className="text-2xl font-bold text-slate-900">Nuevo administrativo</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Completá los datos para registrar un nuevo usuario administrativo
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-lg">
        <form action={action} className="space-y-4">
          <Field label="Nombre completo" id="fullName" required>
            <Input id="fullName" name="fullName" placeholder="María González" required />
          </Field>

          <Field label="Email" id="email" required>
            <Input id="email" name="email" type="email" placeholder="maria@cervantes.com" required />
          </Field>

          <Field label="Teléfono" id="phone">
            <Input id="phone" name="phone" type="tel" placeholder="+54 351 123 4567" />
          </Field>

          {state?.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Creando..." : "Crear administrativo"}
            </Button>
            <Link
              href="/admin/users"
              className="inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors h-10 px-4 text-sm border border-brand-700 bg-white text-brand-700 hover:bg-brand-50"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
