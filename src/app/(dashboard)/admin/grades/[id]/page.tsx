import { notFound } from "next/navigation";
import Link from "next/link";
import { getGradeById } from "@/modules/grades/services/grades.service";
import { updateGradeAction, deleteGradeAction } from "@/modules/grades/actions";
import { getEnrollments } from "@/modules/enrollments/services/enrollments.service";
import { GradeForm } from "@/modules/grades/components/GradeForm";
import { FormButton } from "@/components/ui/FormButton";
import { Badge } from "@/components/ui/Badge";

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
  const [grade, enrollments] = await Promise.all([getGradeById(id), getEnrollments()]);

  if (!grade) notFound();

  const score = parseFloat(grade.score);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <Link href="/admin/grades" className="text-sm text-slate-400 hover:text-slate-600 mb-1 block">
            ← Notas
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
        enrollments={enrollments.filter((e) => e.status === "active")}
        grade={grade}
        action={updateGradeAction}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
