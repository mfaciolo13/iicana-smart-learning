import { getTeachers } from "@/modules/teachers/services/teachers.service";
import { db } from "@/lib/drizzle";
import { courses, teachers, enrollments } from "@/lib/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { createObservationAction } from "@/modules/teacher-evaluations/actions";
import { ObservationForm } from "@/modules/teacher-evaluations/components/ObservationForm";

export default async function NewObservationPage() {
  const teacherList = await getTeachers();

  const courseList = await db
    .select({ id: courses.id, name: courses.name, teacherId: courses.teacherId })
    .from(courses)
    .where(eq(courses.status, "active"));

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Registrar observación de clase</h2>
        <p className="text-sm text-slate-400 mt-0.5">Completá el formulario de observación</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-2xl">
        <ObservationForm
          teachers={teacherList}
          courses={courseList}
          action={createObservationAction}
        />
      </div>
    </div>
  );
}
