"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import type { z } from "zod";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Field, Select, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { createComplaintSchema } from "../schemas";
import type { ActionResult } from "@/lib/action-result";
import { useFormAction } from "@/lib/use-form-action";

type FormValues = z.infer<typeof createComplaintSchema>;

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
  const form = useForm<FormValues>({
    resolver: zodResolver(createComplaintSchema),
    defaultValues: { type: undefined, description: "" },
  });
  const { register, formState: { errors } } = form;
  const { formRef, onSubmit, isPending } = useFormAction(form, action);

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-6">
      <Card title="Datos del reclamo" padding="md">
        <div className="space-y-4">
          <Field label="Categoría" required id="type" error={errors.type?.message}>
            <Select id="type" {...register("type")} defaultValue="">
              <option value="" disabled>Seleccioná la categoría</option>
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          </Field>

          <Field label="Descripción" required id="description" error={errors.description?.message}>
            <Textarea
              id="description"
              {...register("description")}
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
