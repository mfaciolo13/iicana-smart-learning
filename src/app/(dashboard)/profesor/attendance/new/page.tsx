import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";
import { recordAttendanceAction } from "@/modules/attendance/actions";
import { AttendanceTaker } from "@/modules/attendance/components/AttendanceTaker";
import { Input, Field, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import type { EnrollmentListItem } from "@/modules/enrollments/types";
import type { AttendanceRecord } from "@/modules/attendance/types";

const STATUS_LABELS: Record<string, { label: string; variant: "success" | "warning" | "danger" }> = {
  present: { label: "Presente", variant: "success" },
  absent: { label: "Ausente", variant: "danger" },
  late: { label: "Tarde", variant: "warning" },
};

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
    const { data: enrollmentRows } = await supabase
      .from("enrollments")
      .select("id, enrolled_at, status, students(profiles(full_name), dni), courses(name, level)")
      .eq("course_id", courseId);

    type StudentRaw = { profiles: { full_name: string } | null; dni: string } | null;
    type CourseRaw = { name: string; level: string } | null;

    enrollments = (enrollmentRows ?? []).map((e) => {
      const student = e.students as unknown as StudentRaw;
      const course = e.courses as unknown as CourseRaw;
      return {
        id: e.id,
        enrolledAt: new Date(e.enrolled_at),
        status: e.status as EnrollmentListItem["status"],
        studentName: student?.profiles?.full_name ?? "",
        studentDni: student?.dni ?? "",
        courseName: course?.name ?? "",
        courseLevel: course?.level ?? "",
      };
    });

    const enrollmentIds = enrollments.map((e) => e.id);

    if (enrollmentIds.length > 0) {
      const { data: attendanceRows } = await supabase
        .from("attendance")
        .select("id, enrollment_id, class_date, status, notes, created_at, enrollments(students(profiles(full_name), dni), courses(name))")
        .in("enrollment_id", enrollmentIds)
        .eq("class_date", classDate);

      alreadyRecorded = (attendanceRows ?? []).length > 0;

      if (alreadyRecorded) {
        type AttEnrRaw = {
          students: { profiles: { full_name: string } | null; dni: string } | null;
          courses: { name: string } | null;
        } | null;

        existingRecords = (attendanceRows ?? [])
          .map((r) => {
            const enr = r.enrollments as unknown as AttEnrRaw;
            return {
              id: r.id,
              enrollmentId: r.enrollment_id,
              classDate: r.class_date,
              status: r.status as AttendanceRecord["status"],
              notes: r.notes as string | null,
              createdAt: new Date(r.created_at),
              studentName: enr?.students?.profiles?.full_name ?? "",
              studentDni: enr?.students?.dni ?? "",
              courseName: enr?.courses?.name ?? "",
            };
          })
          .sort((a, b) => a.studentName.localeCompare(b.studentName));
      }
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
                redirectTo="/profesor/attendance"
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
