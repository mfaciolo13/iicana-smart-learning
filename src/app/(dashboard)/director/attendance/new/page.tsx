import { createClient } from "@/lib/supabase/server";
import { getEnrollmentsByCourse } from "@/modules/enrollments/services/enrollments.service";
import { recordAttendanceAction } from "@/modules/attendance/actions";
import { AttendanceTaker } from "@/modules/attendance/components/AttendanceTaker";
import { AttendanceSessionEditor } from "@/modules/attendance/components/AttendanceSessionEditor";
import { Input, Field, Select } from "@/components/ui/Input";
import type { EnrollmentListItem } from "@/modules/enrollments/types";
import { formatDateAR } from "@/lib/format";

export default async function TakeAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string; date?: string; view?: string }>;
}) {
  const { courseId, date } = await searchParams;
  const today = new Date().toISOString().split("T")[0];
  const classDate = date ?? today;

  const supabase = await createClient();

  const { data: courseRows } = await supabase.from("courses").select("id, name, status").order("name");
  const activeCourses = (courseRows ?? []).filter((c) => c.status === "active");

  let enrollments: EnrollmentListItem[] = [];
  let alreadyRecorded = false;
  let existingRecords: Array<{ enrollmentId: string; status: string }> = [];

  if (courseId) {
    enrollments = await getEnrollmentsByCourse(courseId);

    const enrollmentIds = enrollments.map((e) => e.id);

    if (enrollmentIds.length > 0) {
      const { count } = await supabase
        .from("attendance")
        .select("id", { count: "exact", head: true })
        .in("enrollment_id", enrollmentIds)
        .eq("class_date", classDate);
      alreadyRecorded = (count ?? 0) > 0;

      if (alreadyRecorded) {
        const { data: attRows } = await supabase
          .from("attendance")
          .select("enrollment_id, status")
          .in("enrollment_id", enrollmentIds)
          .eq("class_date", classDate);
        existingRecords = (attRows ?? []).map((a) => ({
          enrollmentId: a.enrollment_id,
          status: a.status,
        }));
      }
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
        <Field label="Curso" required id="courseId" className="min-w-60">
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
            <AttendanceSessionEditor
              enrollments={enrollments}
              existingRecords={existingRecords}
              courseId={courseId}
              classDate={classDate}
              redirectTo="/director/attendance"
            />
          ) : (
            <>
              <h3 className="text-base font-semibold text-slate-900 mb-1">
                Clase del {formatDateAR(classDate)}
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
