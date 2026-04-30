import Link from "next/link";
import { getStudents } from "@/modules/students/services/students.service";
import { StudentList } from "@/modules/students/components/StudentList";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const students = await getStudents(q);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Alumnos</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {students.length} alumno{students.length !== 1 ? "s" : ""}{" "}
            registrado{students.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/admin/students/new"
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          + Nuevo alumno
        </Link>
      </div>

      {/* Search */}
      <form className="mb-4">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Buscar por nombre, email o DNI..."
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </form>

      <div className="bg-white rounded-xl border border-gray-200 px-6 py-4">
        <StudentList students={students} />
      </div>
    </div>
  );
}
