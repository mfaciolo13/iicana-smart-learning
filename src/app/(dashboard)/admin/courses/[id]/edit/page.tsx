import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateCourseAction } from "@/modules/courses/actions";
import { CourseForm } from "@/modules/courses/components/CourseForm";
import type { CourseWithTeacher } from "@/modules/courses/types";
import type { TeacherListItem } from "@/modules/teachers/types";
import { getCachedTeachers } from "@/lib/query-cache";

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: courseRow }, teachers] = await Promise.all([
    supabase
      .from("courses")
      .select("id, name, level, schedule, classroom, max_capacity, status, created_at, updated_at, teacher_id")
      .eq("id", id)
      .single(),
    getCachedTeachers(),
  ]);

  if (!courseRow) notFound();

  const currentTeacher = courseRow.teacher_id
    ? (teachers.find((t) => t.id === courseRow.teacher_id) ?? null)
    : null;

  const course: CourseWithTeacher = {
    id: courseRow.id,
    name: courseRow.name,
    level: courseRow.level as CourseWithTeacher["level"],
    schedule: courseRow.schedule,
    classroom: courseRow.classroom as string | null,
    maxCapacity: courseRow.max_capacity,
    status: courseRow.status as CourseWithTeacher["status"],
    teacherId: courseRow.teacher_id as string | null,
    createdAt: new Date(courseRow.created_at),
    updatedAt: new Date(courseRow.updated_at),
    teacher: currentTeacher ? { fullName: currentTeacher.fullName, email: currentTeacher.email } : null,
    enrollmentCount: 0,
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Editar curso</h2>
        <p className="text-sm text-slate-400 mt-0.5">{course.name}</p>
      </div>
      <CourseForm course={course} teachers={teachers} action={updateCourseAction} submitLabel="Guardar cambios" />
    </div>
  );
}
