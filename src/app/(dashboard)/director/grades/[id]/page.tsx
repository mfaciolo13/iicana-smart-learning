import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { updateGradeAction, deleteGradeAction } from "@/modules/grades/actions";
import { GradeForm } from "@/modules/grades/components/GradeForm";
import { FormButton } from "@/components/ui/FormButton";
import { Badge } from "@/components/ui/Badge";
import type { GradeWithDetails, EvaluationType } from "@/modules/grades/types";
import type { EnrollmentListItem } from "@/modules/enrollments/types";

function scoreVariant(score: number): "success" | "warning" | "danger" {
  if (score >= 7) return "success";
  if (score >= 5) return "warning";
  return "danger";
}

const TYPE_LABELS: Record<string, string> = {
  parcial: "Parcial",
  final: "Final",
  oral: "Oral",
  homework: "Tarea",
  quiz: "Quiz",
};

export default async function GradeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: gradeRow }, { data: enrollmentRows }] = await Promise.all([
    supabase
      .from("grades")
      .select("id, enrollment_id, evaluation_type, score, evaluated_at, notes, enrollments(course_id, students(profiles(full_name), dni), courses(name, level))")
      .eq("id", id)
      .single(),
    supabase
      .from("enrollments")
      .select("id, enrolled_at, status, students(profiles(full_name), dni), courses(name, level)")
      .eq("status", "active"),
  ]);

  // SCRUM-234: tras eliminar desde el detalle, volver al listado en lugar de mostrar un 404.
  if (!gradeRow) redirect("/director/grades");

  type EnrRaw = {
    course_id: string;
    students: { profiles: { full_name: string } | null; dni: string } | null;
    courses: { name: string; level: string } | null;
  } | null;

  const enrRaw = gradeRow.enrollments as unknown as EnrRaw;

  const grade: GradeWithDetails = {
    id: gradeRow.id,
    enrollmentId: gradeRow.enrollment_id,
    evaluationType: gradeRow.evaluation_type as EvaluationType,
    score: gradeRow.score,
    evaluatedAt: new Date(gradeRow.evaluated_at),
    notes: gradeRow.notes as string | null,
    studentName: enrRaw?.students?.profiles?.full_name ?? "",
    studentDni: enrRaw?.students?.dni ?? "",
    courseName: enrRaw?.courses?.name ?? "",
    courseLevel: enrRaw?.courses?.level ?? "",
  };

  type EnrollmentStudentRaw = { profiles: { full_name: string } | null; dni: string } | null;
  type EnrollmentCourseRaw = { name: string; level: string } | null;

  const enrollments: EnrollmentListItem[] = (enrollmentRows ?? []).map((e) => {
    const student = e.students as unknown as EnrollmentStudentRaw;
    const course = e.courses as unknown as EnrollmentCourseRaw;
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

  const score = parseFloat(grade.score);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <Link href="/director/grades" className="text-sm text-slate-400 hover:text-slate-600 mb-1 inline-flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Notas
          </Link>
          <h2 className="text-2xl font-bold text-slate-900">
            {grade.studentName} — {TYPE_LABELS[grade.evaluationType] ?? grade.evaluationType}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">{grade.courseName}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={scoreVariant(score)} dot={false} className="text-base px-3 py-1">
            {score.toFixed(1)}
          </Badge>
          <FormButton
            action={deleteGradeAction}
            fields={{ id: grade.id }}
            variant="danger"
            size="sm"
            confirmMessage="¿Eliminar esta nota?"
          >
            Eliminar
          </FormButton>
        </div>
      </div>

      <GradeForm
        enrollments={enrollments}
        grade={grade}
        action={updateGradeAction}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
