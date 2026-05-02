import { getTeachers } from "@/modules/teachers/services/teachers.service";
import { createCourseAction } from "@/modules/courses/actions";
import { CourseForm } from "@/modules/courses/components/CourseForm";

export default async function NewCoursePage() {
  const teachers = await getTeachers();

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
