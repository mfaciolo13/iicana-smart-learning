"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Field, Select, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

const TYPE_OPTIONS = [
  { value: "academic", label: "Académico — notas, promedios, contenido" },
  { value: "administrative", label: "Administrativo — pagos, inscripciones, documentación" },
  { value: "infrastructure", label: "Infraestructura — instalaciones, equipamiento" },
  { value: "teacher", label: "Docente — conducta, metodología, comunicación" },
];

interface ComplaintFormProps {
  cancelHref: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action: (formData: FormData) => Promise<any>;
}

export function ComplaintForm({ cancelHref, action }: ComplaintFormProps) {
  return (
    <form action={action} className="space-y-6">
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

          <p className="text-xs text-slate-400">
            Tu reclamo será revisado por el equipo administrativo en un plazo máximo de 48hs.
          </p>
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Link href={cancelHref} className={buttonVariants({ variant: "secondary" })}>
          Cancelar
        </Link>
        <Button type="submit" variant="primary">
          Enviar reclamo
        </Button>
      </div>
    </form>
  );
}
