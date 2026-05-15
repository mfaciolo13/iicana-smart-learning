import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";
import { GradeList } from "@/modules/grades/components/GradeList";
import { buttonVariants } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import type { GradeWithDetails, EvaluationType } from "@/modules/grades/types";

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
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!teacherRow) redirect("/login");

  const [{ data: courseRows }, { data: gradeRows }] = await Promise.all([
    supabase
      .from("courses")
      .select("id, name")
      .eq("teacher_id", teacherRow.id)
      .eq("status", "active")
      .order("name"),
    supabase
      .from("grades")
      .select("id, enrollment_id, evaluation_type, score, evaluated_at, notes, enrollments(course_id, students(profiles(full_name), dni), courses(name, level))")
      .order("evaluated_at", { ascending: false }),
  ]);

  const myCourses = courseRows ?? [];
  const teacherCourseIds = new Set(myCourses.map((c) => c.id));
  const validCourseId = courseId && teacherCourseIds.has(courseId) ? courseId : undefined;

  type EnrRaw = {
    course_id: string;
    students: { profiles: { full_name: string } | null; dni: string } | null;
    courses: { name: string; level: string } | null;
  } | null;

  type GradeRow = GradeWithDetails & { _courseId: string };

  const allGrades: GradeRow[] = (gradeRows ?? []).map((g) => {
    const enr = g.enrollments as unknown as EnrRaw;
    return {
      id: g.id,
      enrollmentId: g.enrollment_id,
      evaluationType: g.evaluation_type as EvaluationType,
      score: g.score,
      evaluatedAt: new Date(g.evaluated_at),
      notes: g.notes as string | null,
      studentName: enr?.students?.profiles?.full_name ?? "",
      studentDni: enr?.students?.dni ?? "",
      courseName: enr?.courses?.name ?? "",
      courseLevel: enr?.courses?.level ?? "",
      _courseId: enr?.course_id ?? "",
    };
  });

  const gradesList: GradeWithDetails[] = validCourseId
    ? allGrades.filter((g) => g._courseId === validCourseId)
    : allGrades.filter((g) => teacherCourseIds.has(g._courseId));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Notas</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {gradesList.length} evaluación{gradesList.length !== 1 ? "es" : ""} registrada{gradesList.length !== 1 ? "s" : ""}
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
