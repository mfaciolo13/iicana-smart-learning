"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Field, Select, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import type { ActionResult } from "@/lib/action-result";

const TYPE_OPTIONS = [
  { value: "academic", label: "Académico — notas, promedios, contenido" },
  { value: "administrative", label: "Administrativo — pagos, inscripciones, documentación" },
  { value: "infrastructure", label: "Infraestructura — instalaciones, equipamiento" },
  { value: "teacher", label: "Docente — conducta, metodología, comunicación" },
];

interface ComplaintFormProps {
  cancelHref: string;
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}

export function ComplaintForm({ cancelHref, action }: ComplaintFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) {
      toast.success(state.success);
      if (state.redirectTo) router.push(state.redirectTo);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-6">
      <Card title="Datos del reclamo" padding="md">
        <div className="space-y-4">
          <Field label="Categoría" required id="type">
            <Select id="type" name="type" required defaultValue="">
              <option value="" disabled>Seleccioná la categoría</option>
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          </Field>

          <Field label="Descripción" required id="description">
            <Textarea
              id="description"
              name="description"
              required
              minLength={20}
              maxLength={1000}
              placeholder="Describí el problema con el mayor detalle posible (mín. 20 caracteres)..."
              className="min-h-[140px]"
            />
          </Field>

          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Tu reclamo será revisado por el equipo administrativo en un plazo máximo de 48hs.
          </p>
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Link href={cancelHref} className={buttonVariants({ variant: "secondary" })}>
          Cancelar
        </Link>
        <Button type="submit" variant="primary" loading={isPending}>
          Enviar reclamo
        </Button>
      </div>
    </form>
  );
}
