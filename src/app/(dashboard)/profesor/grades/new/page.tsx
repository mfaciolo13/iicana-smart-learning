import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/helpers";
import { getEnrollmentsByTeacherProfile } from "@/modules/enrollments/services/enrollments.service";
import { createGradeAction } from "@/modules/grades/actions";
import { GradeForm } from "@/modules/grades/components/GradeForm";

export default async function ProfesorNewGradePage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const enrollments = await getEnrollmentsByTeacherProfile(user.id);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Cargar nota</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Registrá el resultado de una evaluación para un alumno inscripto en tus cursos
        </p>
      </div>
      <GradeForm
        enrollments={enrollments}
        action={createGradeAction}
        submitLabel="Cargar nota"
        cancelHref="/profesor/grades"
        redirectTo="/profesor/grades"
      />
    </div>
  );
}
