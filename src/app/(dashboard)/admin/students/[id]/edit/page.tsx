import { notFound } from "next/navigation";
import { getStudentById, getTutorsList } from "@/modules/students/services/students.service";
import { updateStudentAction } from "@/modules/students/actions";
import { StudentForm } from "@/modules/students/components/StudentForm";

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [student, tutors] = await Promise.all([getStudentById(id), getTutorsList()]);

  if (!student) notFound();

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">
          Editar alumno
        </h2>
        <p className="text-sm text-slate-400 mt-0.5">
          {student.profile.fullName}
        </p>
      </div>

      <StudentForm
        student={student}
        tutors={tutors}
        action={updateStudentAction}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
