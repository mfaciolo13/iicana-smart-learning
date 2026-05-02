import { getStudents } from "@/modules/students/services/students.service";
import { getCourses } from "@/modules/courses/services/courses.service";
import { createEnrollmentAction } from "@/modules/enrollments/actions";
import { EnrollmentForm } from "@/modules/enrollments/components/EnrollmentForm";

export default async function NewEnrollmentPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string; courseId?: string }>;
}) {
  const { studentId, courseId } = await searchParams;

  const [students, courses] = await Promise.all([getStudents(), getCourses()]);

  const activeStudents = students.filter((s) => s.status === "active");

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
