import Link from "next/link";
import { StudentList } from "@/modules/students/components/StudentList";
import { buttonVariants } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { StudentListItem } from "@/modules/students/types";
import { getCachedStudents } from "@/lib/query-cache";

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
    const lower = q.toLowerCase();
    students = students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(lower) ||
        s.email.toLowerCase().includes(lower) ||
        s.dni.toLowerCase().includes(lower)
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

      <form className="mb-4">
        <Input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Buscar por nombre, email o DNI..."
          className="w-full sm:max-w-sm"
        />
      </form>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-4 sm:px-6">
        <StudentList students={students} />
      </div>
    </div>
  );
}
