"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Toggle } from "@/components/ui/Toggle";
import { updateUserNotificationPreferenceAction } from "../actions";
import type { UserNotificationPreferenceRow } from "../services/notification-preferences.service";
import type { AlertType } from "@/lib/drizzle/schema";

const ALERT_LABELS: Record<AlertType, { title: string; description: string }> = {
  class_reminder: {
    title: "Recordatorio de clase",
    description: "Recordatorio por email la noche anterior a tu clase",
  },
  absence: {
    title: "Alerta de ausencia",
    description: "Email cuando tu docente registra una ausencia",
  },
  payment_reminder: {
    title: "Recordatorio de pago",
    description: "Aviso cuando tu cuota está próxima a vencer",
  },
  grade_published: {
    title: "Publicación de nota",
    description: "Email cuando se publica una nueva nota",
  },
};

const ORDER: AlertType[] = ["class_reminder", "absence", "payment_reminder", "grade_published"];

interface UserNotificationPreferencesFormProps {
  preferences: UserNotificationPreferenceRow[];
}

export function UserNotificationPreferencesForm({ preferences }: UserNotificationPreferencesFormProps) {
  const [rows, setRows] = useState(preferences);
  const [isPending, startTransition] = useTransition();

  function handleToggle(alertType: AlertType, enabled: boolean) {
    const previous = rows;
    setRows((prev) => prev.map((r) => (r.alertType === alertType ? { ...r, userEnabled: enabled } : r)));

    startTransition(async () => {
      const formData = new FormData();
      formData.set("alertType", alertType);
      formData.set("enabled", String(enabled));

      const result = await updateUserNotificationPreferenceAction(undefined, formData);
      if (result?.error) {
        toast.error(result.error);
        setRows(previous);
      } else if (result?.success) {
        toast.success(result.success);
      }
    });
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
      {ORDER.map((alertType) => {
        const row = rows.find((r) => r.alertType === alertType);
        if (!row) return null;
        const labels = ALERT_LABELS[alertType];
        const disabledByInstitute = !row.globalEnabled;

        return (
          <div key={alertType} className="flex items-center justify-between gap-4 px-6 py-4">
            <div>
              <p className="text-sm font-medium text-slate-900">{labels.title}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {disabledByInstitute ? "El instituto desactivó este tipo de alerta" : labels.description}
              </p>
            </div>
            <Toggle
              checked={disabledByInstitute ? false : row.userEnabled}
              onChange={(enabled) => handleToggle(alertType, enabled)}
              disabled={disabledByInstitute || isPending}
              label={labels.title}
            />
          </div>
        );
      })}
    </div>
  );
}
