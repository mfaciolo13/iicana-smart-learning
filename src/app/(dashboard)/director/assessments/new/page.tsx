import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { generateAssessmentAction } from "@/modules/assessments/actions";
import { GenerateAssessmentForm } from "@/modules/assessments/components/GenerateAssessmentForm";
import { getDocuments } from "@/modules/documents/services/documents.service";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

export default async function NewAssessmentPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("courses")
    .select("id, name, level, status")
    .order("name");

  const activeCourses = (rows ?? [])
    .filter((c) => c.status === "active")
    .map((c) => ({ id: c.id, name: c.name, level: c.level }));

  const docs = await getDocuments();
  const documentOptions = docs.map((d) => ({
    id: d.id,
    name: d.name,
    mimeType: d.mimeType,
  }));

  return (
    <div>
      <div className="mb-6">
        <Link href="/director/assessments" className="text-sm text-slate-400 hover:text-slate-600 mb-1 inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Autoevaluaciones
        </Link>
        <h2 className="text-2xl font-bold text-slate-900">Nueva evaluación con IA</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Completá el tema y Claude generará 10 preguntas de opción múltiple automáticamente.
        </p>
      </div>

      <div className="max-w-xl">
        <Card title="Configuración del quiz" padding="md">
          <GenerateAssessmentForm
            courses={activeCourses}
            action={generateAssessmentAction}
            documents={documentOptions}
          />
        </Card>

        <div className="mt-4 p-4 bg-brand-50 border border-brand-200 rounded-xl">
          <p className="text-xs text-brand-700 font-medium mb-1">¿Cómo funciona?</p>
          <ol className="text-xs text-brand-600 space-y-1 list-decimal list-inside">
            <li>Completá el curso, la semana y el tema.</li>
            <li>Opcionalmente, adjuntá material de referencia (PDF o imágenes).</li>
            <li>Claude genera 10 preguntas con opciones y explicaciones.</li>
            <li>Revisás las preguntas y publicás cuando estés listo.</li>
            <li>Los alumnos ven la evaluación en su portal y la responden.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
