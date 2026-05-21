import { createGradeAction } from "@/modules/grades/actions";
import { GradeForm } from "@/modules/grades/components/GradeForm";
import { getEnrollments } from "@/modules/enrollments/services/enrollments.service";

export default async function NewGradePage() {
  const allEnrollments = await getEnrollments();
  const activeEnrollments = allEnrollments.filter((e) => e.status === "active");

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Cargar nota</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Registrá el resultado de una evaluación para un alumno inscripto
        </p>
      </div>
      <GradeForm enrollments={activeEnrollments} action={createGradeAction} submitLabel="Cargar nota" />
    </div>
  );
}
