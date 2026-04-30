import { notFound } from "next/navigation";
import Link from "next/link";
import { getStudentById } from "@/modules/students/services/students.service";
import { deleteStudentAction } from "@/modules/students/actions";

const STATUS_LABELS: Record<string, string> = {
  active: "Activo",
  inactive: "Inactivo",
  suspended: "Suspendido",
  graduated: "Egresado",
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Principiante",
  elementary: "Elemental",
  pre_intermediate: "Pre-intermedio",
  intermediate: "Intermedio",
  upper_intermediate: "Upper-intermedio",
  advanced: "Avanzado",
};

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const student = await getStudentById(id);

  if (!student) notFound();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href="/admin/students"
            className="text-sm text-gray-400 hover:text-gray-600 mb-1 block"
          >
            ← Alumnos
          </Link>
          <h2 className="text-2xl font-bold text-gray-900">
            {student.profile.fullName}
          </h2>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/admin/students/${student.id}/edit`}
            className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Editar
          </Link>
          <form action={deleteStudentAction as never}>
            <input type="hidden" name="id" value={student.id} />
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              onClick={(e) => {
                if (
                  !confirm(
                    "¿Estás seguro de eliminar este alumno? Esta acción no se puede deshacer."
                  )
                ) {
                  e.preventDefault();
                }
              }}
            >
              Eliminar
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Personal data */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">
            Datos personales
          </h3>
          <dl className="space-y-3">
            {[
              { label: "Email", value: student.profile.email },
              { label: "Teléfono", value: student.profile.phone ?? "—" },
              { label: "DNI", value: student.dni },
              { label: "Fecha de nacimiento", value: student.birthDate },
            ].map((item) => (
              <div key={item.label} className="flex justify-between text-sm">
                <dt className="text-gray-500">{item.label}</dt>
                <dd className="font-medium text-gray-800">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Academic data */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">
            Datos académicos
          </h3>
          <dl className="space-y-3">
            {[
              {
                label: "Nivel",
                value: student.level ? LEVEL_LABELS[student.level] : "Sin asignar",
              },
              {
                label: "Estado",
                value: STATUS_LABELS[student.status] ?? student.status,
              },
              {
                label: "Alta",
                value: new Date(student.createdAt).toLocaleDateString("es-AR"),
              },
            ].map((item) => (
              <div key={item.label} className="flex justify-between text-sm">
                <dt className="text-gray-500">{item.label}</dt>
                <dd className="font-medium text-gray-800">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
