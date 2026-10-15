import { ChartCard } from "@/components/charts/ChartCard";
import { BarsChart } from "@/components/charts/BarsChart";
import { TrendChart } from "@/components/charts/TrendChart";
import { COLORS, withColor } from "@/components/charts/palette";
import { getAcademicAnalytics } from "@/modules/analytics/services/director-analytics.service";

type Part = "attendance" | "grades" | "distribution" | "occupancy";

/** Asistencia y notas en el tiempo, distribución de notas y ocupación de cursos. */
export async function AcademicPanel({
  parts = ["attendance", "grades", "distribution", "occupancy"],
  coursesHref = "/director/courses",
}: {
  parts?: Part[];
  /** null = sin enlace (el administrativo no tiene pantalla de cursos). */
  coursesHref?: string | null;
}) {
  const a = await getAcademicAnalytics();
  const show = (p: Part) => parts.includes(p);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {show("attendance") && (
        <ChartCard
          title="Asistencia por mes"
          subtitle="% de presentes y tardanzas sobre las clases registradas"
          empty={a.attendanceByMonth.every((p) => p.asistencia === null)}
          emptyText="Todavía no hay asistencia registrada en los últimos 6 meses"
        >
          <TrendChart
            data={a.attendanceByMonth}
            xKey="mes"
            format="percent"
            yDomain={[0, 100]}
            series={[{ key: "asistencia", label: "Asistencia", color: COLORS.brand }]}
            referenceLine={{ y: 80, label: "mínimo 80%" }}
          />
        </ChartCard>
      )}

      {show("grades") && (
        <ChartCard
          title="Promedio de notas por mes"
          subtitle="Promedio de las evaluaciones cargadas · línea verde = aprobación (7)"
          empty={a.gradesByMonth.every((p) => p.promedio === null)}
          emptyText="Todavía no hay notas cargadas en los últimos 6 meses"
        >
          <TrendChart
            kind="line"
            data={a.gradesByMonth}
            xKey="mes"
            format="grade"
            yDomain={[1, 10]}
            series={[{ key: "promedio", label: "Promedio", color: COLORS.violet }]}
            referenceLine={{ y: 7, label: "aprobación" }}
          />
        </ChartCard>
      )}

      {show("distribution") && (
        <ChartCard
          title="Distribución de notas"
          subtitle="Cuántas evaluaciones hay en cada rango"
          empty={a.gradeDistribution.every((d) => d.notas === 0)}
          emptyText="Todavía no hay notas cargadas"
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
      )}

      {show("occupancy") && (
        <ChartCard
          title="Ocupación de cursos"
          subtitle="Inscriptos activos sobre el cupo de cada curso activo"
          href={coursesHref ?? undefined}
          empty={a.occupancy.length === 0}
          emptyText="No hay cursos activos"
        >
          <BarsChart
            data={withColor(a.occupancy, (o) => (o.ocupacion >= 100 ? COLORS.red : o.ocupacion >= 80 ? COLORS.amber : COLORS.brand))}
            xKey="curso"
            layout="vertical"
            format="percent"
            domain={[0, 100]}
            showLabels
            height={Math.max(180, a.occupancy.length * 34 + 40)}
            series={[{ key: "ocupacion", label: "Ocupación" }]}
            colorKey="color"
          />
        </ChartCard>
      )}
    </div>
  );
}
