import { getCourses } from "@/modules/courses/services/courses.service";
import { generateAssessmentAction } from "@/modules/assessments/actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import Link from "next/link";

export default async function NewAssessmentPage() {
  const courses = await getCourses();
  const activeCourses = courses.filter((c) => c.status === "active");

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/assessments" className="text-sm text-slate-400 hover:text-slate-600 mb-1 block">
          ← Autoevaluaciones
        </Link>
        <h2 className="text-2xl font-bold text-slate-900">Nueva evaluación con IA</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Completá el tema y Claude generará 10 preguntas de opción múltiple automáticamente.
        </p>
      </div>

      <div className="max-w-xl">
        <Card title="Configuración del quiz" padding="md">
          <form action={generateAssessmentAction} className="space-y-5 mt-2">
            <Field label="Curso" required id="courseId">
              <Select id="courseId" name="courseId" required>
                <option value="">Seleccioná un curso...</option>
                {activeCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.level}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Semana" required id="weekLabel" helper="Ej: Semana 3 — Mayo 2026">
              <Input
                id="weekLabel"
                name="weekLabel"
                required
                placeholder="Semana 3 — Mayo 2026"
              />
            </Field>

            <Field label="Tema de la semana" required id="topic" helper="Describí el contenido dado: gramática, vocabulario, función comunicativa, etc.">
              <Textarea
                id="topic"
                name="topic"
                required
                rows={3}
                placeholder="Ej: Present Perfect — usos con 'already', 'yet' y 'just'. Vocabulario de viajes."
              />
            </Field>

            <div className="pt-1 flex flex-col sm:flex-row gap-3">
              <Button type="submit" variant="primary" className="w-full sm:w-auto">
                ✨ Generar con IA
              </Button>
              <Link
                href="/admin/assessments"
                className="text-sm text-slate-500 hover:text-slate-700 flex items-center justify-center"
              >
                Cancelar
              </Link>
            </div>
          </form>
        </Card>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-xs text-blue-700 font-medium mb-1">¿Cómo funciona?</p>
          <ol className="text-xs text-blue-600 space-y-1 list-decimal list-inside">
            <li>Completá el curso, la semana y el tema.</li>
            <li>Claude genera 10 preguntas con opciones y explicaciones.</li>
            <li>Revisás las preguntas y publicás cuando estés listo.</li>
            <li>Los alumnos ven la evaluación en su portal y la responden.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
