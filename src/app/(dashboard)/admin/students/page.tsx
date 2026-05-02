import Link from "next/link";
import { getStudents } from "@/modules/students/services/students.service";
import { StudentList } from "@/modules/students/components/StudentList";
import { buttonVariants } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const students = await getStudents(q);

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
        <Link href="/admin/students/new" className={buttonVariants({ variant: "primary" })}>
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
