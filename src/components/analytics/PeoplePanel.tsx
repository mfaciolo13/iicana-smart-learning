import { ChartCard } from "@/components/charts/ChartCard";
import { BarsChart } from "@/components/charts/BarsChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { COLORS } from "@/components/charts/palette";
import { getPeopleAnalytics } from "@/modules/analytics/services/director-analytics.service";

type Part = "enrollments" | "status" | "risk";

const STATUS_COLORS: Record<string, string> = {
  Activos: COLORS.green,
  Inactivos: COLORS.slate,
  Suspendidos: COLORS.amber,
  Egresados: COLORS.brand,
};
const RISK_COLORS: Record<string, string> = { Bajo: COLORS.amber, Medio: "#f97316", Alto: COLORS.red };

/** Altas por mes, estado de los alumnos y riesgo de abandono. */
export async function PeoplePanel({
  parts = ["enrollments", "status", "risk"],
  studentsHref = "/director/students",
  riskHref,
}: {
  parts?: Part[];
  studentsHref?: string;
  riskHref?: string;
}) {
  const p = await getPeopleAnalytics();
  const show = (k: Part) => parts.includes(k);
  const riskTotal = p.riskByLevel.reduce((s, r) => s + r.alumnos, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {show("enrollments") && (
        <ChartCard
          title="Inscripciones por mes"
          subtitle="Altas de alumnos en cursos"
          empty={p.enrollmentsByMonth.every((m) => !m.altas)}
          emptyText="Todavía no hay inscripciones en los últimos 6 meses"
        >
          <BarsChart data={p.enrollmentsByMonth} xKey="mes" format="number" showLabels series={[{ key: "altas", label: "Inscripciones", color: COLORS.brand }]} />
        </ChartCard>
      )}

      {show("status") && (
        <ChartCard title="Alumnos por estado" subtitle="Total registrado en el sistema" href={studentsHref} empty={p.studentsByStatus.length === 0}>
          <DonutChart
            centerLabel="alumnos"
            data={p.studentsByStatus.map((s) => ({ label: s.estado, value: s.alumnos, color: STATUS_COLORS[s.estado] }))}
          />
        </ChartCard>
      )}

      {show("risk") && (
        <ChartCard
          title="Riesgo de abandono"
          subtitle="Alumnos activos según el último análisis"
          href={riskHref}
          empty={riskTotal === 0}
          emptyText="Ningún alumno en riesgo según el último análisis"
        >
          <DonutChart centerLabel="en riesgo" data={p.riskByLevel.map((r) => ({ label: r.nivel, value: r.alumnos, color: RISK_COLORS[r.nivel] }))} />
        </ChartCard>
      )}
    </div>
  );
}
