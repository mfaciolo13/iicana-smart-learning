"use client";

import { useRef } from "react";
import Link from "next/link";
import type { TeacherWithProfile } from "../types";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

interface TeacherFormProps {
  teacher?: TeacherWithProfile;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action: (formData: FormData) => Promise<any>;
  submitLabel?: string;
}

export function TeacherForm({ teacher, action, submitLabel = "Guardar" }: TeacherFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const isEditing = !!teacher;

  return (
    <form ref={formRef} action={action} className="space-y-6">
      {isEditing && <input type="hidden" name="id" value={teacher.id} />}

      <Card title="Datos personales" padding="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre completo" required id="fullName">
            <Input
              id="fullName"
              name="fullName"
              type="text"
              required
              defaultValue={teacher?.profile.fullName}
              placeholder="Juan Pérez"
            />
          </Field>

          <Field label="DNI" required id="dni">
            <Input
              id="dni"
              name="dni"
              type="text"
              required
              minLength={7}
              maxLength={8}
              defaultValue={teacher?.dni}
              placeholder="12345678"
            />
          </Field>

          {!isEditing && (
            <Field label="Email" required id="email">
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="docente@email.com"
              />
            </Field>
          )}

          <Field label="Teléfono" id="phone">
            <Input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={teacher?.profile.phone ?? ""}
              placeholder="+54 9 351 000 0000"
            />
          </Field>
        </div>
      </Card>

      <Card title="Datos profesionales" padding="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Especialización" id="specialization">
            <Input
              id="specialization"
              name="specialization"
              type="text"
              defaultValue={teacher?.specialization ?? ""}
              placeholder="ej. Cambridge CELTA, Phonics..."
            />
          </Field>
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Link href="/admin/teachers" className={buttonVariants({ variant: "secondary" })}>
          Cancelar
        </Link>
        <Button type="submit" variant="primary">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
