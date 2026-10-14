import Link from "next/link";
import { StudentList } from "@/modules/students/components/StudentList";
import { buttonVariants } from "@/components/ui/Button";
import type { StudentListItem } from "@/modules/students/types";
import { getCachedStudents } from "@/lib/query-cache";
import { SearchInput } from "@/components/ui/SearchInput";
import { matchesSearch } from "@/lib/search";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  let students: StudentListItem[] = (await getCachedStudents()).map((s) => ({
    ...s,
    level: s.level as StudentListItem["level"],
    status: s.status as StudentListItem["status"],
  }));

  if (q) {
    students = students.filter(
      (s) =>
        matchesSearch(s.fullName, q) || matchesSearch(s.email, q) || matchesSearch(s.dni, q)
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Alumnos</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {students.length} alumno{students.length !== 1 ? "s" : ""}{" "}
            registrado{students.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/director/students/new" className={buttonVariants({ variant: "primary" })}>
          + Nuevo alumno
        </Link>
      </div>

      <SearchInput placeholder="Buscar por nombre, email o DNI..." resultCount={students.length} className="mb-4" />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-4 sm:px-6">
        <StudentList students={students} />
      </div>
    </div>
  );
}
