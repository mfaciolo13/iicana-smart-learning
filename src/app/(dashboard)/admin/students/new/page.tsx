import { createStudentAction } from "@/modules/students/actions";
import { StudentForm } from "@/modules/students/components/StudentForm";
import { getTutorsList } from "@/modules/students/services/students.service";

export default async function NewStudentPage() {
  const tutors = await getTutorsList();

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Nuevo alumno</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Completá los datos para registrar un nuevo alumno
        </p>
      </div>

      <StudentForm
        tutors={tutors}
        action={createStudentAction}
        submitLabel="Registrar alumno"
      />
    </div>
  );
}
