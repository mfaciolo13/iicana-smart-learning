import Link from "next/link";
import type { TeacherListItem } from "../types";

interface TeacherListProps {
  teachers: TeacherListItem[];
}

export function TeacherList({ teachers }: TeacherListProps) {
  if (teachers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="text-base font-semibold text-slate-700">Aún no hay docentes cargados</p>
        <p className="text-sm text-slate-400 mt-1">Empezá registrando el primero.</p>
        <Link
          href="/admin/teachers/new"
          className="mt-4 inline-flex items-center gap-1 px-4 py-2 text-sm bg-brand-700 text-white rounded-lg hover:bg-brand-800 transition-colors font-medium"
        >
          + Nuevo docente
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" role="table">
        <thead>
          <tr className="border-b-2 border-brand-700">
            <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4">
              Nombre
            </th>
            <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4">
              DNI
            </th>
            <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4 hidden md:table-cell">
              Email
            </th>
            <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4 hidden sm:table-cell">
              Especialización
            </th>
            <th className="py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {teachers.map((teacher) => (
            <tr key={teacher.id} className="hover:bg-brand-50 transition-colors">
              <td className="py-3.5 pr-4 font-medium text-slate-900">{teacher.fullName}</td>
              <td className="py-3.5 pr-4 font-mono text-slate-600 text-xs">{teacher.dni}</td>
              <td className="py-3.5 pr-4 text-slate-500 hidden md:table-cell">{teacher.email}</td>
              <td className="py-3.5 pr-4 text-slate-500 hidden sm:table-cell">
                {teacher.specialization ?? <span className="text-slate-400">—</span>}
              </td>
              <td className="py-3.5 text-right">
                <Link
                  href={`/admin/teachers/${teacher.id}`}
                  className="text-brand-700 hover:underline text-xs font-medium"
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
