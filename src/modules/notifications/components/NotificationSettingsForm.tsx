"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Toggle } from "@/components/ui/Toggle";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { updateNotificationSettingAction } from "../actions";
import type { NotificationSettingRow } from "../services/notification-settings.service";
import type { AlertType } from "@/lib/drizzle/schema";

const ALERT_LABELS: Record<AlertType, { title: string; description: string }> = {
  class_reminder: {
    title: "Recordatorio de clase",
    description: "Aviso a alumnos la noche anterior a cada clase",
  },
  absence: {
    title: "Alerta de ausencia",
    description: "Email al alumno cuando se registra su ausencia",
  },
  payment_reminder: {
    title: "Recordatorio de pago",
    description: "Aviso cuando una cuota está próxima a vencer",
  },
  grade_published: {
    title: "Publicación de nota",
    description: "Email al alumno cuando se carga una nueva nota",
  },
};

const ORDER: AlertType[] = ["class_reminder", "absence", "payment_reminder", "grade_published"];

interface NotificationSettingsFormProps {
  settings: NotificationSettingRow[];
}

export function NotificationSettingsForm({ settings }: NotificationSettingsFormProps) {
  const [rows, setRows] = useState(settings);
  const [timingHours, setTimingHours] = useState(
    settings.find((s) => s.alertType === "class_reminder")?.timingHours ?? 24
  );
  const [isPending, startTransition] = useTransition();

  function handleToggle(alertType: AlertType, enabled: boolean) {
    const previous = rows;
    setRows((prev) => prev.map((r) => (r.alertType === alertType ? { ...r, enabled } : r)));

    startTransition(async () => {
      const formData = new FormData();
      formData.set("alertType", alertType);
      formData.set("enabled", String(enabled));

      const result = await updateNotificationSettingAction(undefined, formData);
      if (result?.error) {
        toast.error(result.error);
        setRows(previous);
      } else if (result?.success) {
        toast.success(result.success);
      }
    });
  }

  function handleTimingSave() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("alertType", "class_reminder");
      formData.set("enabled", String(rows.find((r) => r.alertType === "class_reminder")?.enabled ?? true));
      formData.set("timingHours", String(timingHours));

      const result = await updateNotificationSettingAction(undefined, formData);
      if (result?.error) toast.error(result.error);
      else if (result?.success) toast.success(result.success);
    });
  }

  const classReminderEnabled = rows.find((r) => r.alertType === "class_reminder")?.enabled ?? false;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        {ORDER.map((alertType) => {
          const row = rows.find((r) => r.alertType === alertType);
          const labels = ALERT_LABELS[alertType];
          return (
            <div key={alertType} className="flex items-center justify-between gap-4 px-6 py-4">
              <div>
                <p className="text-sm font-medium text-slate-900">{labels.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{labels.description}</p>
              </div>
              <Toggle
                checked={row?.enabled ?? false}
                onChange={(enabled) => handleToggle(alertType, enabled)}
                disabled={isPending}
                label={labels.title}
              />
            </div>
          );
        })}
      </div>

      {classReminderEnabled && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Configuración avanzada</h3>
          <p className="text-xs text-slate-400 mb-4">Recordatorio de clase</p>
          <div className="flex items-end gap-3 max-w-xs">
            <Field
              label="Horas de anticipación"
              id="timingHours"
              helper={
                Number.isInteger(timingHours) && timingHours >= 1 && timingHours <= 72
                  ? `El recordatorio se enviará ${timingHours} horas antes de cada clase.`
                  : "Ingresá un valor entero entre 1 y 72 horas."
              }
            >
              <Input
                id="timingHours"
                type="number"
                min={1}
                max={72}
                value={timingHours}
                onChange={(e) => setTimingHours(Number(e.target.value))}
              />
            </Field>
            <Button type="button" variant="secondary" onClick={handleTimingSave} loading={isPending}>
              Guardar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
