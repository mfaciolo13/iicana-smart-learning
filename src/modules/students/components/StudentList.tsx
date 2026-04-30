import Link from "next/link";
import type { StudentListItem } from "../types";

const STATUS_LABELS: Record<string, string> = {
  active: "Activo",
  inactive: "Inactivo",
  suspended: "Suspendido",
  graduated: "Egresado",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-600",
  suspended: "bg-red-100 text-red-700",
  graduated: "bg-blue-100 text-blue-700",
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Principiante",
  elementary: "Elemental",
  pre_intermediate: "Pre-intermedio",
  intermediate: "Intermedio",
  upper_intermediate: "Upper-intermedio",
  advanced: "Avanzado",
};

interface StudentListProps {
  students: StudentListItem[];
}

export function StudentList({ students }: StudentListProps) {
  if (students.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        No se encontraron alumnos.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left font-medium text-gray-500 py-3 pr-4">
              Nombre
            </th>
            <th className="text-left font-medium text-gray-500 py-3 pr-4">
              DNI
            </th>
            <th className="text-left font-medium text-gray-500 py-3 pr-4">
              Email
            </th>
            <th className="text-left font-medium text-gray-500 py-3 pr-4">
              Nivel
            </th>
            <th className="text-left font-medium text-gray-500 py-3 pr-4">
              Estado
            </th>
            <th className="py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {students.map((student) => (
            <tr key={student.id} className="hover:bg-gray-50 transition-colors">
              <td className="py-3 pr-4 font-medium text-gray-900">
                {student.fullName}
              </td>
              <td className="py-3 pr-4 text-gray-600">{student.dni}</td>
              <td className="py-3 pr-4 text-gray-600">{student.email}</td>
              <td className="py-3 pr-4 text-gray-600">
                {student.level ? LEVEL_LABELS[student.level] : "—"}
              </td>
              <td className="py-3 pr-4">
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    STATUS_COLORS[student.status] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {STATUS_LABELS[student.status] ?? student.status}
                </span>
              </td>
              <td className="py-3 text-right">
                <Link
                  href={`/admin/students/${student.id}`}
                  className="text-blue-600 hover:underline text-xs"
                >
                  Ver →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
