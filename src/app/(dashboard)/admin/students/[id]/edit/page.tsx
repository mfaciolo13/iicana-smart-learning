import { notFound } from "next/navigation";
import { getStudentById } from "@/modules/students/services/students.service";
import { updateStudentAction } from "@/modules/students/actions";
import { StudentForm } from "@/modules/students/components/StudentForm";

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const student = await getStudentById(id);

  if (!student) notFound();

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Editar alumno
        </h2>
        <p className="text-sm text-gray-400 mt-0.5">
          {student.profile.fullName}
        </p>
      </div>

      <StudentForm
        student={student}
        action={updateStudentAction}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
