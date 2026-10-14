import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";
import { getGradesByTeacherProfile } from "@/modules/grades/services/grades.service";
import { GradeList } from "@/modules/grades/components/GradeList";
import { buttonVariants } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { plural } from "@/lib/plural";

export default async function ProfesorGradesPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const { courseId } = await searchParams;
  const supabase = await createClient();

  const { data: teacherRow } = await supabase
    .from("teachers")
    .select("id, courses(id, name)")
    .eq("profile_id", user.id)
    .single();

  if (!teacherRow) redirect("/login");

  const myCourses = (teacherRow.courses as unknown as { id: string; name: string }[] | null) ?? [];
  const teacherCourseIds = new Set(myCourses.map((c) => c.id));
  const validCourseId = courseId && teacherCourseIds.has(courseId) ? courseId : undefined;

  const gradesList = await getGradesByTeacherProfile(user.id, validCourseId);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Notas</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {plural(gradesList.length, "evaluación registrada", "evaluaciones registradas")}
          </p>
        </div>
        <Link href="/profesor/grades/new" className={buttonVariants({ variant: "primary" })}>
          + Cargar nota
        </Link>
      </div>

      <form method="GET" className="mb-4">
        <Select name="courseId" defaultValue={validCourseId ?? ""} className="w-full sm:max-w-sm">
          <option value="">Todos mis cursos</option>
          {myCourses.map((c) => (
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
