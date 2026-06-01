import { createClient } from "@/lib/supabase/server";
import { createEnrollmentAction } from "@/modules/enrollments/actions";
import { EnrollmentForm } from "@/modules/enrollments/components/EnrollmentForm";
import type { StudentListItem } from "@/modules/students/types";
import type { CourseListItem } from "@/modules/courses/types";
import { getCachedStudents } from "@/lib/query-cache";

export default async function NewEnrollmentPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string; courseId?: string }>;
}) {
  const { studentId, courseId } = await searchParams;
  const supabase = await createClient();

  const [cachedStudents, { data: rawCourseRows }, { data: enrollmentRows }] = await Promise.all([
    getCachedStudents(),
    supabase.from("courses").select("id, name, level, schedule, status, max_capacity, teacher_id").order("name"),
    supabase.from("enrollments").select("course_id").eq("status", "active"),
  ]);

  // Teacher names for courses
  const courseTeacherIds = (rawCourseRows ?? []).filter((c) => c.teacher_id).map((c) => c.teacher_id as string);
  const { data: courseTeacherRows } = courseTeacherIds.length > 0
    ? await supabase.from("teachers").select("id, profile_id").in("id", courseTeacherIds)
    : { data: [] as { id: string; profile_id: string }[] };
  const courseTeacherProfileIds = (courseTeacherRows ?? []).map((t) => t.profile_id);
  const { data: courseTeacherProfileRows } = courseTeacherProfileIds.length > 0
    ? await supabase.from("profiles").select("id, full_name").in("id", courseTeacherProfileIds)
    : { data: [] as { id: string; full_name: string }[] };
  const teacherProfileMap = new Map((courseTeacherProfileRows ?? []).map((p) => [p.id, p.full_name]));
  const teacherNameByTeacherId = new Map(
    (courseTeacherRows ?? []).map((t) => [t.id, teacherProfileMap.get(t.profile_id) ?? null])
  );

  const allStudents: StudentListItem[] = cachedStudents.map((s) => ({
    ...s,
    level: s.level as StudentListItem["level"],
    status: s.status as StudentListItem["status"],
  }));

  const countByCourse = new Map<string, number>();
  for (const e of enrollmentRows ?? []) {
    countByCourse.set(e.course_id, (countByCourse.get(e.course_id) ?? 0) + 1);
  }

  const courses: CourseListItem[] = (rawCourseRows ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    level: c.level as CourseListItem["level"],
    schedule: c.schedule,
    status: c.status as CourseListItem["status"],
    maxCapacity: c.max_capacity,
    teacherName: c.teacher_id ? (teacherNameByTeacherId.get(c.teacher_id) ?? null) : null,
    enrollmentCount: countByCourse.get(c.id) ?? 0,
  }));

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
