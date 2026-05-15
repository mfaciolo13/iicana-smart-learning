import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StudentList } from "@/modules/students/components/StudentList";
import { buttonVariants } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { StudentListItem } from "@/modules/students/types";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  const { data: studentRows } = await supabase
    .from("students")
    .select("id, dni, level, status, profile_id");

  const profileIds = (studentRows ?? []).map((s) => s.profile_id);
  const { data: profileRows } = profileIds.length > 0
    ? await supabase.from("profiles").select("id, full_name, email").in("id", profileIds)
    : { data: [] as { id: string; full_name: string; email: string }[] };

  const profileMap = new Map((profileRows ?? []).map((p) => [p.id, p]));

  let students: StudentListItem[] = (studentRows ?? [])
    .map((s) => {
      const profile = profileMap.get(s.profile_id);
      return {
        id: s.id,
        fullName: profile?.full_name ?? "",
        email: profile?.email ?? "",
        dni: s.dni,
        level: s.level as StudentListItem["level"],
        status: s.status as StudentListItem["status"],
      };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

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
