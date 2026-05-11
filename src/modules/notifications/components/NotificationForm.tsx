"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { CourseListItem } from "@/modules/courses/types";
import type { Profile } from "@/lib/drizzle/schema";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Input, Field, Select, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import type { ActionResult } from "@/lib/action-result";

const TYPE_OPTIONS = [
  { value: "general", label: "General" },
  { value: "absence", label: "Ausencia" },
  { value: "payment", label: "Pago" },
  { value: "grade", label: "Nota" },
  { value: "alert", label: "Alerta" },
];

interface NotificationFormProps {
  courses: CourseListItem[];
  users: Pick<Profile, "id" | "fullName" | "role">[];
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}

export function NotificationForm({ courses, users, action }: NotificationFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, undefined);
  const [targetGroup, setTargetGroup] = useState<"role" | "course" | "user">("role");

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) {
      toast.success(state.success);
      if (state.redirectTo) router.push(state.redirectTo);
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-6">
      <Card title="Destinatario" padding="md">
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {(["role", "course", "user"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTargetGroup(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  targetGroup === t
                    ? "bg-brand-700 text-white border-brand-700"
                    : "bg-white text-slate-600 border-slate-200 hover:border-brand-300"
                }`}
              >
                {t === "role" ? "Por rol" : t === "course" ? "Por curso" : "Usuario individual"}
              </button>
            ))}
          </div>

          {targetGroup === "role" && (
            <Field label="Rol destinatario" required id="targetId">
              <Select id="targetId" name="targetId" required defaultValue="">
                <option value="" disabled>Seleccioná un rol</option>
                <option value="role:alumno">Todos los alumnos</option>
                <option value="role:profesor">Todos los docentes</option>
                <option value="role:admin">Administradores</option>
              </Select>
            </Field>
          )}

          {targetGroup === "course" && (
            <Field label="Curso" required id="targetId">
              <Select id="targetId" name="targetId" required defaultValue="">
                <option value="" disabled>Seleccioná un curso</option>
                {courses.map((c) => (
                  <option key={c.id} value={`course:${c.id}`}>{c.name}</option>
                ))}
              </Select>
            </Field>
          )}

          {targetGroup === "user" && (
            <Field label="Usuario" required id="targetId">
              <Select id="targetId" name="targetId" required defaultValue="">
                <option value="" disabled>Seleccioná un usuario</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
                ))}
              </Select>
            </Field>
          )}
        </div>
      </Card>

      <Card title="Mensaje" padding="md">
        <div className="space-y-4">
          <Field label="Tipo" required id="type">
            <Select id="type" name="type" required defaultValue="general">
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          </Field>

          <Field label="Título" required id="title">
            <Input id="title" name="title" required maxLength={100} placeholder="Ej: Recordatorio de pago" />
          </Field>

          <Field label="Mensaje" required id="body">
            <Textarea id="body" name="body" required maxLength={500} placeholder="Escribí el contenido de la notificación..." className="min-h-[100px]" />
          </Field>
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Link href="/admin/notifications" className={buttonVariants({ variant: "secondary" })}>
          Cancelar
        </Link>
        <Button type="submit" variant="primary" loading={isPending}>
          Enviar notificación
        </Button>
      </div>
    </form>
  );
}
