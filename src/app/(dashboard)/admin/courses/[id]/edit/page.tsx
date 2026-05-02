import { notFound } from "next/navigation";
import { getCourseById } from "@/modules/courses/services/courses.service";
import { getTeachers } from "@/modules/teachers/services/teachers.service";
import { updateCourseAction } from "@/modules/courses/actions";
import { CourseForm } from "@/modules/courses/components/CourseForm";

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [course, teachers] = await Promise.all([getCourseById(id), getTeachers()]);

  if (!course) notFound();

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
