"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import type { z } from "zod";
import type { CourseListItem } from "@/modules/courses/types";
import type { Profile } from "@/lib/drizzle/schema";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Input, Field, Select, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { sendNotificationSchema } from "../schemas";
import type { ActionResult } from "@/lib/action-result";
import { useFormAction } from "@/lib/use-form-action";

type FormValues = z.infer<typeof sendNotificationSchema>;

const TYPE_OPTIONS = [
  { value: "general", label: "General" },
  { value: "absence", label: "Ausencia" },
  { value: "payment", label: "Pago" },
  { value: "grade", label: "Nota" },
  { value: "alert", label: "Alerta" },
];

interface NotificationFormProps {
  /** Destino del botón "Cancelar" (por defecto, portal director). */
  cancelHref?: string;
  courses: CourseListItem[];
  users: Pick<Profile, "id" | "fullName" | "role" | "email">[];
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}

export function NotificationForm({ courses, users, action, cancelHref = "/director/notifications" }: NotificationFormProps) {
  const [targetGroup, setTargetGroup] = useState<"role" | "course" | "user">("role");
  const form = useForm<FormValues>({
    resolver: zodResolver(sendNotificationSchema),
    defaultValues: { targetId: "", type: "general", title: "", body: "" },
  });
  const { register, formState: { errors }, setValue } = form;
  const { formRef, onSubmit, isPending } = useFormAction(form, action);

  function handleGroupChange(group: "role" | "course" | "user") {
    setTargetGroup(group);
    setValue("targetId", "", { shouldValidate: false });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-6">
      <Card title="Destinatario" padding="md">
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {(["role", "course", "user"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleGroupChange(t)}
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

          <Field label={targetGroup === "role" ? "Rol destinatario" : targetGroup === "course" ? "Curso" : "Usuario"} required id="targetId" error={errors.targetId?.message}>
            <Select id="targetId" {...register("targetId")} defaultValue="">
              <option value="" disabled>Seleccioná {targetGroup === "role" ? "un rol" : targetGroup === "course" ? "un curso" : "un usuario"}</option>
              {targetGroup === "role" && (
                <>
                  <option value="role:alumno">Todos los alumnos</option>
                  <option value="role:profesor">Todos los docentes</option>
                  <option value="role:director">Directores</option>
                  <option value="role:administrativo">Personal administrativo</option>
                </>
              )}
              {targetGroup === "course" && courses.map((c) => (
                <option key={c.id} value={`course:${c.id}`}>{c.name}</option>
              ))}
              {targetGroup === "user" && users.map((u) => (
                <option key={u.id} value={u.id}>{u.fullName} ({u.role}) · {u.email}</option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <Card title="Mensaje" padding="md">
        <div className="space-y-4">
          <Field label="Tipo" required id="type" error={errors.type?.message}>
            <Select id="type" {...register("type")}>
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          </Field>

          <Field label="Título" required id="title" error={errors.title?.message}>
            <Input id="title" maxLength={100} placeholder="Ej: Recordatorio de pago" {...register("title")} />
          </Field>

          <Field label="Mensaje" required id="body" error={errors.body?.message}>
            <Textarea id="body" maxLength={500} placeholder="Escribí el contenido de la notificación..." className="min-h-[100px]" {...register("body")} />
          </Field>
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Link href={cancelHref} className={buttonVariants({ variant: "secondary" })}>
          Cancelar
        </Link>
        <Button type="submit" variant="primary" loading={isPending}>
          Enviar notificación
        </Button>
      </div>
    </form>
  );
}
