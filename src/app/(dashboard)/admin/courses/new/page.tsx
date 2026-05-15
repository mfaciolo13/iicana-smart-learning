import { createCourseAction } from "@/modules/courses/actions";
import { CourseForm } from "@/modules/courses/components/CourseForm";
import type { TeacherListItem } from "@/modules/teachers/types";
import { getCachedTeachers } from "@/lib/query-cache";

export default async function NewCoursePage() {
  const teachers: TeacherListItem[] = await getCachedTeachers();

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Nuevo curso</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Completá los datos para crear un nuevo curso
        </p>
      </div>
      <CourseForm teachers={teachers} action={createCourseAction} submitLabel="Crear curso" />
    </div>
  );
}
