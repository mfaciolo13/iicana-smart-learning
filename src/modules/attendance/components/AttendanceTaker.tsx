"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import type { EnrollmentListItem } from "@/modules/enrollments/types";
import type { ActionResult } from "@/lib/action-result";

const STATUS_OPTIONS = [
  { value: "present", label: "Presente", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  { value: "absent", label: "Ausente", color: "text-red-700 bg-red-50 border-red-200" },
  { value: "late", label: "Tarde", color: "text-amber-700 bg-amber-50 border-amber-200" },
];

interface AttendanceTakerProps {
  enrollments: EnrollmentListItem[];
  courseId: string;
  classDate: string;
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  redirectTo?: string;
}

export function AttendanceTaker({ enrollments, courseId, classDate, action, redirectTo }: AttendanceTakerProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) {
      toast.success(state.success);
      if (state.redirectTo) router.push(state.redirectTo);
    }
  }, [state]);

  if (enrollments.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-slate-400">
        No hay alumnos activos inscriptos en este curso.
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-1">
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="classDate" value={classDate} />
      <input type="hidden" name="enrollmentIds" value={enrollments.map((e) => e.id).join(",")} />
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}

      <div className="space-y-1">
        {enrollments.map((enrollment) => (
          <div
            key={enrollment.id}
            className="flex items-center gap-4 px-4 py-3 rounded-lg border border-slate-100 hover:bg-slate-50"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{enrollment.studentName}</p>
              <p className="text-xs text-slate-400 font-mono">{enrollment.studentDni}</p>
            </div>

            <div className="flex gap-1.5 shrink-0">
              {STATUS_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name={`status_${enrollment.id}`}
                    value={opt.value}
                    defaultChecked={opt.value === "present"}
                    className="sr-only peer"
                  />
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-all peer-checked:ring-2 peer-checked:ring-offset-1 cursor-pointer ${opt.color} peer-checked:ring-current`}>
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit" variant="primary" loading={isPending}>
          Guardar asistencia ({enrollments.length} alumnos)
        </Button>
      </div>
    </form>
  );
}
