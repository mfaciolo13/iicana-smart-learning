import { getCourses } from "@/modules/courses/services/courses.service";
import { getEnrollmentsByCourse } from "@/modules/enrollments/services/enrollments.service";
import { getAttendanceByCourse, isAttendanceRecorded } from "@/modules/attendance/services/attendance.service";
import { recordAttendanceAction } from "@/modules/attendance/actions";
import { AttendanceTaker } from "@/modules/attendance/components/AttendanceTaker";
import { Input, Field, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

const STATUS_LABELS: Record<string, { label: string; variant: "success" | "warning" | "danger" }> = {
  present: { label: "Presente", variant: "success" },
  absent: { label: "Ausente", variant: "danger" },
  late: { label: "Tarde", variant: "warning" },
};

export default async function TakeAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string; date?: string; view?: string }>;
}) {
  const { courseId, date, view } = await searchParams;
  const today = new Date().toISOString().split("T")[0];
  const classDate = date ?? today;

  const courses = await getCourses();
  const activeCourses = courses.filter((c) => c.status === "active");

  let enrollments: Awaited<ReturnType<typeof getEnrollmentsByCourse>> = [];
  let alreadyRecorded = false;
  let existingRecords: Awaited<ReturnType<typeof getAttendanceByCourse>> = [];

  if (courseId) {
    [enrollments, alreadyRecorded] = await Promise.all([
      getEnrollmentsByCourse(courseId),
      isAttendanceRecorded(courseId, classDate),
    ]);

    if (alreadyRecorded) {
      existingRecords = await getAttendanceByCourse(courseId, classDate);
    }
  }

  const activeEnrollments = enrollments.filter((e) => e.status === "active");

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Tomar asistencia</h2>
        <p className="text-sm text-slate-400 mt-0.5">Seleccioná el curso y la fecha para registrar la asistencia</p>
      </div>

      {/* Filters */}
      <form method="GET" className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-4 flex flex-wrap gap-4 items-end">
        <Field label="Curso" required id="courseId" className="min-w-[240px]">
          <Select id="courseId" name="courseId" defaultValue={courseId ?? ""} required>
            <option value="" disabled>Seleccioná un curso</option>
            {activeCourses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </Field>

        <Field label="Fecha" required id="date">
          <Input id="date" name="date" type="date" defaultValue={classDate} required />
        </Field>

        <button
          type="submit"
          className="h-10 px-4 text-sm font-medium bg-brand-700 text-white rounded-lg hover:bg-brand-800 transition-colors"
        >
          Cargar
        </button>
      </form>

      {/* Content */}
      {courseId && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          {alreadyRecorded ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-slate-900">
                  Asistencia del {new Date(classDate).toLocaleDateString("es-AR")}
                </h3>
                <Badge variant="info" dot={false}>Ya registrada</Badge>
              </div>
              <div className="space-y-1">
                {existingRecords.map((r) => {
                  const cfg = STATUS_LABELS[r.status] ?? { label: r.status, variant: "neutral" as const };
                  return (
                    <div key={r.id} className="flex items-center justify-between px-4 py-3 rounded-lg border border-slate-100">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{r.studentName}</p>
                        <p className="text-xs text-slate-400 font-mono">{r.studentDni}</p>
                      </div>
                      <Badge variant={cfg.variant} dot={false}>{cfg.label}</Badge>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-slate-400 mt-4 text-center">
                Para corregir, comunicate con el administrador del sistema.
              </p>
            </div>
          ) : (
            <>
              <h3 className="text-base font-semibold text-slate-900 mb-1">
                Clase del {new Date(classDate).toLocaleDateString("es-AR")}
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                {activeEnrollments.length} alumno{activeEnrollments.length !== 1 ? "s" : ""} inscriptos
              </p>
              <AttendanceTaker
                enrollments={activeEnrollments}
                courseId={courseId}
                classDate={classDate}
                action={recordAttendanceAction}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
