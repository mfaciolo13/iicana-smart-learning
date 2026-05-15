import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
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

  const [{ data: gradesData }, { data: coursesData }] = await Promise.all([
    supabase
      .from("grades")
      .select("id, enrollment_id, evaluation_type, score, evaluated_at, notes, enrollments(course_id, students(profiles(full_name), dni), courses(name, level))")
      .order("evaluated_at", { ascending: false }),
    supabase.from("courses").select("id, name").order("name"),
  ]);

  type EnrollmentRaw = {
    course_id: string;
    students: { profiles: { full_name: string } | null; dni: string } | null;
    courses: { name: string; level: string } | null;
  } | null;

  const mapped = (gradesData ?? []).map((g) => {
    const enrollment = g.enrollments as unknown as EnrollmentRaw;
    return {
      id: g.id,
      enrollmentId: g.enrollment_id,
      courseId: enrollment?.course_id ?? "",
      evaluationType: g.evaluation_type,
      score: g.score,
      evaluatedAt: new Date(g.evaluated_at),
      notes: g.notes as string | null,
      studentName: enrollment?.students?.profiles?.full_name ?? "",
      studentDni: enrollment?.students?.dni ?? "",
      courseName: enrollment?.courses?.name ?? "",
      courseLevel: enrollment?.courses?.level ?? "",
    };
  });

  const gradesList = courseId ? mapped.filter((g) => g.courseId === courseId) : mapped;
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
        <Link href="/admin/grades/new" className={buttonVariants({ variant: "primary" })}>
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
