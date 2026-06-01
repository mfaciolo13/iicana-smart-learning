import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getGrades } from "@/modules/grades/services/grades.service";
import { GradeList } from "@/modules/grades/components/GradeList";
import { buttonVariants } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";

export default async function GradesPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const { courseId } = await searchParams;
  const supabase = await createClient();

  const [gradesList, { data: coursesData }] = await Promise.all([
    getGrades(courseId),
    supabase.from("courses").select("id, name").order("name"),
  ]);

  const courses = (coursesData ?? []).map((c) => ({ id: c.id, name: c.name }));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Notas</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {gradesList.length} evaluación{gradesList.length !== 1 ? "es" : ""} registrada{gradesList.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/director/grades/new" className={buttonVariants({ variant: "primary" })}>
          + Cargar nota
        </Link>
      </div>

      <form method="GET" className="mb-4">
        <Select name="courseId" defaultValue={courseId ?? ""} className="w-full sm:max-w-sm">
          <option value="">Todos los cursos</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
      </form>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-4 sm:px-6">
        <GradeList grades={gradesList} showNewLink />
      </div>
    </div>
  );
}
