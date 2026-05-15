import { createClient } from "@/lib/supabase/server";
import { createEnrollmentAction } from "@/modules/enrollments/actions";
import { EnrollmentForm } from "@/modules/enrollments/components/EnrollmentForm";
import type { StudentListItem } from "@/modules/students/types";
import type { CourseListItem } from "@/modules/courses/types";

export default async function NewEnrollmentPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string; courseId?: string }>;
}) {
  const { studentId, courseId } = await searchParams;
  const supabase = await createClient();

  const [{ data: studentRows }, { data: courseRows }, { data: enrollmentRows }] = await Promise.all([
    supabase
      .from("students")
      .select("id, dni, level, status, profiles(full_name, email)")
      .order("full_name", { referencedTable: "profiles" }),
    supabase
      .from("courses")
      .select("id, name, level, schedule, status, max_capacity, teachers(profiles(full_name))")
      .order("name"),
    supabase
      .from("enrollments")
      .select("course_id")
      .eq("status", "active"),
  ]);

  type StudentProfileRaw = { full_name: string; email: string } | null;
  const allStudents: StudentListItem[] = (studentRows ?? []).map((s) => {
    const profile = s.profiles as unknown as StudentProfileRaw;
    return {
      id: s.id,
      fullName: profile?.full_name ?? "",
      email: profile?.email ?? "",
      dni: s.dni,
      level: s.level as StudentListItem["level"],
      status: s.status as StudentListItem["status"],
    };
  });

  const countByCourse = new Map<string, number>();
  for (const e of enrollmentRows ?? []) {
    countByCourse.set(e.course_id, (countByCourse.get(e.course_id) ?? 0) + 1);
  }

  type CourseTeacherRaw = { profiles: { full_name: string } | null } | null;
  const courses: CourseListItem[] = (courseRows ?? []).map((c) => {
    const teacherRaw = c.teachers as unknown as CourseTeacherRaw;
    return {
      id: c.id,
      name: c.name,
      level: c.level as CourseListItem["level"],
      schedule: c.schedule,
      status: c.status as CourseListItem["status"],
      maxCapacity: c.max_capacity,
      teacherName: teacherRaw?.profiles?.full_name ?? null,
      enrollmentCount: countByCourse.get(c.id) ?? 0,
    };
  });

  const activeStudents = allStudents.filter((s) => s.status === "active");

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Nueva inscripción</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Inscribí un alumno en un curso activo con cupo disponible
        </p>
      </div>
      <EnrollmentForm
        students={activeStudents}
        courses={courses}
        action={createEnrollmentAction}
        defaultStudentId={studentId}
        defaultCourseId={courseId}
      />
    </div>
  );
}
