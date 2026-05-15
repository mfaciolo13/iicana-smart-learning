import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EnrollmentList } from "@/modules/enrollments/components/EnrollmentList";
import { buttonVariants } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { EnrollmentListItem } from "@/modules/enrollments/types";

export default async function EnrollmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from("enrollments")
    .select("id, enrolled_at, status, students(profiles(full_name), dni), courses(name, level)")
    .order("enrolled_at", { ascending: true });

  let enrollments: EnrollmentListItem[] = (data ?? []).map((e) => {
    const student = e.students as unknown as { profiles: { full_name: string } | null; dni: string } | null;
    const course = e.courses as unknown as { name: string; level: string } | null;
    return {
      id: e.id,
      enrolledAt: new Date(e.enrolled_at),
      status: e.status as EnrollmentListItem["status"],
      studentName: student?.profiles?.full_name ?? "",
      studentDni: student?.dni ?? "",
      courseName: course?.name ?? "",
      courseLevel: course?.level ?? "",
    };
  });

  if (q) {
    const lower = q.toLowerCase();
    enrollments = enrollments.filter(
      (e) =>
        e.studentName.toLowerCase().includes(lower) ||
        e.studentDni.toLowerCase().includes(lower) ||
        e.courseName.toLowerCase().includes(lower)
    );
  }

  const active = enrollments.filter((e) => e.status === "active").length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Inscripciones</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {active} activa{active !== 1 ? "s" : ""} de {enrollments.length} en total
          </p>
        </div>
        <Link href="/admin/enrollments/new" className={buttonVariants({ variant: "primary" })}>
          + Nueva inscripción
        </Link>
      </div>

      <form className="mb-4">
        <Input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Buscar por alumno, DNI o curso..."
          className="w-full sm:max-w-sm"
        />
      </form>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-4 sm:px-6">
        <EnrollmentList enrollments={enrollments} showNewLink />
      </div>
    </div>
  );
}
