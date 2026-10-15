import { AlertTriangle } from "lucide-react";
import { ChartCard } from "@/components/charts/ChartCard";
import { BarsChart } from "@/components/charts/BarsChart";
import { TrendChart } from "@/components/charts/TrendChart";
import { COLORS, attendanceColor, gradeColor, withColor } from "@/components/charts/palette";
import {
  getTeacherCourseAnalytics,
  getTeacherOverview,
  MIN_SURVEYS_FOR_TEACHER,
} from "@/modules/analytics/services/teacher-analytics.service";

/** Comparación entre los cursos del docente y su propia evaluación anónima. */
export async function TeacherOverviewCharts({ profileId }: { profileId: string }) {
  const o = await getTeacherOverview(profileId);
  const multi = o.perCourse.length > 1;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {multi && (
        <ChartCard
          title="Mis cursos: asistencia y notas"
          subtitle="Asistencia (%) y promedio de notas (sobre 10, escalado ×10) de cada curso"
          empty={o.perCourse.every((c) => c.asistencia === null && c.promedio === null)}
          emptyText="Todavía no hay asistencia ni notas en tus cursos"
        >
          <BarsChart
            data={o.perCourse.map((c) => ({
              curso: c.curso,
              asistencia: c.asistencia,
              promedio: c.promedio === null ? null : Math.round(c.promedio * 10),
            }))}
            xKey="curso"
            format="percent"
            domain={[0, 100]}
            series={[
              { key: "asistencia", label: "Asistencia (%)", color: COLORS.brand },
              { key: "promedio", label: "Promedio de notas (×10)", color: COLORS.violet },
            ]}
          />
        </ChartCard>
      )}

      <ChartCard
        title="Mi evaluación docente"
        subtitle="Promedio de las encuestas anónimas de tus alumnos (1 a 5)"
        empty={o.myRatings === null}
        emptyText={
          o.surveyCount === 0
            ? "Todavía no hay encuestas respondidas"
            : `Se muestra a partir de ${MIN_SURVEYS_FOR_TEACHER} respuestas, para preservar el anonimato (hay ${o.surveyCount})`
        }
      >
        <BarsChart
          data={withColor(o.myRatings ?? [], (r) => (r.promedio >= 4 ? COLORS.green : r.promedio >= 3 ? COLORS.amber : COLORS.red))}
          xKey="criterio"
          layout="vertical"
          format="number"
          domain={[0, 5]}
          categoryWidth={120}
          showLabels
          series={[{ key: "promedio", label: "Promedio" }]}
          colorKey="color"
        />
      </ChartCard>
    </div>
  );
}

/** Todos los gráficos de un curso. */
export async function TeacherCourseCharts({ courseId }: { courseId: string }) {
  const a = await getTeacherCourseAnalytics(courseId);

  return (
    <div className="space-y-4">
      {a.atRisk.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">Alumnos que necesitan atención</p>
            <ul className="mt-1 text-xs text-amber-700 space-y-0.5">
              {a.atRisk.map((r) => (
                <li key={r.alumno}>
                  {r.alumno} · {r.motivo}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Asistencia por clase"
          subtitle="% de presentes y tardanzas en cada clase registrada"
          empty={a.attendanceBySession.length === 0}
          emptyText="Todavía no registraste asistencia en este curso"
        >
          <TrendChart
            data={a.attendanceBySession}
            xKey="fecha"
            format="percent"
            yDomain={[0, 100]}
            series={[{ key: "asistencia", label: "Asistencia", color: COLORS.brand }]}
            referenceLine={{ y: 80, label: "mínimo 80%" }}
          />
        </ChartCard>

        <ChartCard
          title="Promedio por tipo de evaluación"
          subtitle="Cómo les va en parciales, finales, orales, tareas y quizzes"
          empty={a.avgByType.length === 0}
          emptyText="Todavía no cargaste notas en este curso"
        >
          <BarsChart
            data={withColor(a.avgByType, (t) => gradeColor(t.promedio))}
            xKey="tipo"
            format="grade"
            domain={[0, 10]}
            showLabels
            series={[{ key: "promedio", label: "Promedio" }]}
            colorKey="color"
            referenceLine={{ value: 7, label: "aprobación" }}
          />
        </ChartCard>

        <ChartCard
          title="Distribución de notas"
          subtitle="Cuántas evaluaciones hay en cada rango"
          empty={a.gradeDistribution.every((d) => d.notas === 0)}
          emptyText="Todavía no cargaste notas en este curso"
        >
          <BarsChart
            data={withColor(a.gradeDistribution, (d) => {
              const first = Number(d.rango.split("–")[0]);
              return first >= 7 ? COLORS.green : first >= 4 ? COLORS.amber : COLORS.red;
            })}
            xKey="rango"
            format="number"
            showLabels
            series={[{ key: "notas", label: "Notas" }]}
            colorKey="color"
          />
        </ChartCard>

        <ChartCard
          title="Resultados de autoevaluaciones"
          subtitle="Puntaje promedio (0 a 100) de cada autoevaluación publicada"
          empty={a.assessments.length === 0}
          emptyText="Todavía no hay autoevaluaciones rendidas en este curso"
        >
          <BarsChart
            data={withColor(a.assessments, (x) => attendanceColor(x.promedio))}
            xKey="evaluacion"
            layout="vertical"
            format="number"
            domain={[0, 100]}
            categoryWidth={120}
            showLabels
            height={Math.max(160, a.assessments.length * 38 + 40)}
            series={[{ key: "promedio", label: "Puntaje promedio" }]}
            colorKey="color"
          />
        </ChartCard>

        <ChartCard
          title="Asistencia por alumno"
          subtitle="Los 12 con menor asistencia primero"
          empty={a.studentAttendance.length === 0}
          emptyText="Todavía no hay asistencia registrada"
        >
          <BarsChart
            data={withColor(a.studentAttendance, (s) => attendanceColor(s.asistencia))}
            xKey="alumno"
            layout="vertical"
            format="percent"
            domain={[0, 100]}
            categoryWidth={110}
            showLabels
            height={Math.max(180, a.studentAttendance.length * 30 + 40)}
            series={[{ key: "asistencia", label: "Asistencia" }]}
            colorKey="color"
          />
        </ChartCard>

        <ChartCard
          title="Promedio de notas por alumno"
          subtitle="Los 12 con menor promedio primero"
          empty={a.studentGrades.length === 0}
          emptyText="Todavía no hay notas cargadas"
        >
          <BarsChart
            data={withColor(a.studentGrades, (s) => gradeColor(s.promedio))}
            xKey="alumno"
            layout="vertical"
            format="grade"
            domain={[0, 10]}
            categoryWidth={110}
            showLabels
            height={Math.max(180, a.studentGrades.length * 30 + 40)}
            series={[{ key: "promedio", label: "Promedio" }]}
            colorKey="color"
            referenceLine={{ value: 7, label: "aprobación" }}
          />
        </ChartCard>
      </div>
    </div>
  );
}
