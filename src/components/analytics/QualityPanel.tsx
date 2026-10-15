import { ChartCard } from "@/components/charts/ChartCard";
import { BarsChart } from "@/components/charts/BarsChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { COLORS, withColor } from "@/components/charts/palette";
import { getQualityAnalytics } from "@/modules/analytics/services/director-analytics.service";

type Part = "teachers" | "complaints" | "inquiries";

const COMPLAINT_COLORS: Record<string, string> = {
  Abiertos: COLORS.red,
  "En proceso": COLORS.amber,
  Resueltos: COLORS.green,
  Cerrados: COLORS.slate,
};

/** Evaluación docente, reclamos y consultas de marketing. */
export async function QualityPanel({
  parts = ["teachers", "complaints", "inquiries"],
  complaintsHref = "/director/complaints",
}: {
  parts?: Part[];
  complaintsHref?: string;
}) {
  const q = await getQualityAnalytics();
  const show = (k: Part) => parts.includes(k);
  const complaintsTotal = q.complaintsByStatus.reduce((s, r) => s + r.reclamos, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {show("teachers") && (
        <ChartCard
          title="Evaluación docente"
          subtitle="Promedio de las encuestas anónimas (1 a 5)"
          href="/director/teacher-evaluations"
          empty={q.teacherRatings.length === 0}
          emptyText="Todavía no hay encuestas respondidas"
        >
          <BarsChart
            data={withColor(q.teacherRatings, (t) => (t.calificacion >= 4 ? COLORS.green : t.calificacion >= 3 ? COLORS.amber : COLORS.red))}
            xKey="docente"
            layout="vertical"
            format="number"
            domain={[0, 5]}
            showLabels
            height={Math.max(160, q.teacherRatings.length * 40 + 40)}
            series={[{ key: "calificacion", label: "Calificación" }]}
            colorKey="color"
          />
        </ChartCard>
      )}

      {show("complaints") && (
        <ChartCard
          title="Reclamos por estado"
          subtitle="Atención a alumnos"
          href={complaintsHref}
          empty={complaintsTotal === 0}
          emptyText="No hay reclamos registrados"
        >
          <DonutChart centerLabel="reclamos" data={q.complaintsByStatus.map((r) => ({ label: r.estado, value: r.reclamos, color: COMPLAINT_COLORS[r.estado] }))} />
        </ChartCard>
      )}

      {show("inquiries") && (
        <ChartCard
          title="Consultas por canal"
          subtitle="Consultas recibidas e inscriptos por canal de marketing"
          href="/director/marketing"
          empty={q.inquiriesByChannel.length === 0}
          emptyText="Todavía no hay consultas registradas"
        >
          <BarsChart
            data={q.inquiriesByChannel}
            xKey="canal"
            format="number"
            series={[
              { key: "consultas", label: "Consultas", color: COLORS.brandSoft },
              { key: "inscriptos", label: "Inscriptos", color: COLORS.green },
            ]}
          />
        </ChartCard>
      )}
    </div>
  );
}
