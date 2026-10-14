import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";
import { recordAttendanceAction } from "@/modules/attendance/actions";
import { AttendanceTaker } from "@/modules/attendance/components/AttendanceTaker";
import { AttendanceSessionEditor } from "@/modules/attendance/components/AttendanceSessionEditor";
import { Input, Field, Select } from "@/components/ui/Input";
import { getEnrollmentsByCourse } from "@/modules/enrollments/services/enrollments.service";
import { getAttendanceByCourse, isAttendanceRecorded } from "@/modules/attendance/services/attendance.service";
import type { EnrollmentListItem } from "@/modules/enrollments/types";
import type { AttendanceRecord } from "@/modules/attendance/types";
import { formatDateAR } from "@/lib/format";

export default async function ProfesorTakeAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string; date?: string }>;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const { courseId, date } = await searchParams;
  const today = new Date().toISOString().split("T")[0];
  const classDate = date ?? today;

  const supabase = await createClient();

  const { data: teacherRow } = await supabase
    .from("teachers")
    .select("id, courses(id, name)")
    .eq("profile_id", user.id)
    .single();

  const myCourses = (teacherRow?.courses as unknown as { id: string; name: string }[] | null) ?? [];
  const isOwnCourse = courseId && myCourses.some((c) => c.id === courseId);
  if (courseId && !isOwnCourse) redirect("/profesor/attendance");

  let enrollments: EnrollmentListItem[] = [];
  let alreadyRecorded = false;
  let existingRecords: AttendanceRecord[] = [];

  if (courseId && isOwnCourse) {
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
        <p className="text-sm text-slate-400 mt-0.5">Seleccioná el curso y la fecha</p>
      </div>

      <form method="GET" className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-4 flex flex-wrap gap-4 items-end">
        <Field label="Curso" required id="courseId" className="min-w-60">
          <Select id="courseId" name="courseId" defaultValue={courseId ?? ""} required>
            <option value="" disabled>Seleccioná un curso</option>
            {myCourses.map((c) => (
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

      {courseId && isOwnCourse && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          {alreadyRecorded ? (
            <AttendanceSessionEditor
              enrollments={enrollments}
              existingRecords={existingRecords.map((r) => ({
                enrollmentId: r.enrollmentId,
                status: r.status,
              }))}
              courseId={courseId}
              classDate={classDate}
              redirectTo="/profesor/attendance"
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
                redirectTo="/profesor/attendance"
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
