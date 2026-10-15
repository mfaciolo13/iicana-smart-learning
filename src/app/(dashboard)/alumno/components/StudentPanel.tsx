import Link from "next/link";
import { AlertCircle, CalendarClock, CheckCircle2, ClipboardCheck, CreditCard, Star } from "lucide-react";
import { ChartCard } from "@/components/charts/ChartCard";
import { BarsChart } from "@/components/charts/BarsChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { TrendChart } from "@/components/charts/TrendChart";
import { ProgressRing } from "@/components/charts/ProgressRing";
import { COLORS, attendanceColor, withColor } from "@/components/charts/palette";
import { getStudentProgress } from "@/modules/analytics/services/student-analytics.service";
import { formatDateAR } from "@/lib/format";
import { plural } from "@/lib/plural";

const WEEKDAYS_ES: Record<string, string> = {
  monday: "lunes",
  tuesday: "martes",
  wednesday: "miércoles",
  thursday: "jueves",
  friday: "viernes",
  saturday: "sábado",
  sunday: "domingo",
};

function todayWeekday(): string {
  return new Date().toLocaleDateString("en-US", { weekday: "long", timeZone: "America/Argentina/Cordoba" }).toLowerCase();
}

interface TodoItem {
  key: string;
  href: string;
  text: string;
  tone: "danger" | "warn" | "info";
  icon: typeof AlertCircle;
}

const TONES = {
  danger: "bg-red-50 border-red-200 text-red-800 hover:bg-red-100",
  warn: "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100",
  info: "bg-brand-50 border-brand-100 text-brand-800 hover:bg-brand-100",
} as const;

/** "Qué tenés que hacer" + gráficos de progreso del alumno. */
export async function StudentPanel({ studentId, userId }: { studentId: string; userId: string }) {
  const p = await getStudentProgress(studentId, userId);
  const today = todayWeekday();

  const todo: TodoItem[] = [];
  if (p.paymentSummary.vencidas > 0) {
    todo.push({
      key: "overdue",
      href: "/alumno/payments",
      tone: "danger",
      icon: AlertCircle,
      text: `Tenés ${plural(p.paymentSummary.vencidas, "cuota vencida", "cuotas vencidas")}. Regularizá tu pago con la administración.`,
    });
  }
  if (p.paymentSummary.proximoVencimiento) {
    todo.push({
      key: "due",
      href: "/alumno/payments",
      tone: "warn",
      icon: CreditCard,
      text: `Tu próxima cuota vence el ${formatDateAR(p.paymentSummary.proximoVencimiento)}.`,
    });
  }
  if (p.todo.pendingSurveys > 0) {
    todo.push({
      key: "surveys",
      href: "/alumno/evaluations",
      tone: "info",
      icon: Star,
      text: `Tenés ${plural(p.todo.pendingSurveys, "encuesta docente pendiente", "encuestas docentes pendientes")} (anónima).`,
    });
  }
  if (p.todo.pendingAssessments > 0) {
    todo.push({
      key: "assessments",
      href: "/alumno/assessments",
      tone: "info",
      icon: ClipboardCheck,
      text: `Tenés ${plural(p.todo.pendingAssessments, "autoevaluación sin rendir", "autoevaluaciones sin rendir")}.`,
    });
  }
  for (const c of p.courses.filter((x) => x.classDays.includes(today))) {
    todo.push({
      key: `class-${c.id}`,
      href: "/alumno/attendance",
      tone: "info",
      icon: CalendarClock,
      text: `Hoy (${WEEKDAYS_ES[today]}) tenés clase de ${c.name} a las ${c.classTime.slice(0, 5)}.`,
    });
  }

  const payTotal = p.paymentSummary.pagadas + p.paymentSummary.porVencer + p.paymentSummary.vencidas;
  const avgGrade = p.gradesTimeline.length > 0 ? p.gradesTimeline.reduce((s, g) => s + g.nota, 0) / p.gradesTimeline.length : null;

  return (
    <div className="space-y-4">
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5" aria-label="Qué tenés que hacer">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Qué tenés que hacer</h3>
        {todo.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 className="w-4 h-4" /> Estás al día: no tenés nada pendiente.
          </p>
        ) : (
          <ul className="space-y-2">
            {todo.map((t) => {
              const Icon = t.icon;
              return (
                <li key={t.key}>
                  <Link href={t.href} className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-colors ${TONES[t.tone]}`}>
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{t.text}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ChartCard title="Mi asistencia" subtitle={p.attendance.total > 0 ? `${p.attendance.present} de ${p.attendance.total} clases` : "Sin clases registradas"} href="/alumno/attendance" hrefLabel="Ver detalle">
          <div className="flex justify-center py-1">
            <ProgressRing
              value={p.attendance.pct ?? 0}
              label={p.attendance.pct === null ? "Sin datos todavía" : p.attendance.pct >= 80 ? "Vas bien" : "Cuidado: el mínimo es 80%"}
              centerText={p.attendance.pct === null ? "—" : `${Math.round(p.attendance.pct)}%`}
              color={p.attendance.pct === null ? COLORS.slate : attendanceColor(p.attendance.pct)}
            />
          </div>
        </ChartCard>

        <ChartCard title="Mi promedio" subtitle={p.gradesTimeline.length > 0 ? `Sobre mis últimas ${p.gradesTimeline.length} notas` : "Sin notas todavía"} href="/alumno/grades" hrefLabel="Ver notas">
          <div className="flex justify-center py-1">
            <ProgressRing
              value={avgGrade === null ? 0 : avgGrade * 10}
              label={avgGrade === null ? "Sin datos todavía" : avgGrade >= 7 ? "Estás aprobando" : "Por debajo de 7"}
              centerText={avgGrade === null ? "—" : avgGrade.toFixed(1)}
              color={avgGrade === null ? COLORS.slate : avgGrade >= 7 ? COLORS.green : avgGrade >= 5 ? COLORS.amber : COLORS.red}
            />
          </div>
        </ChartCard>

        <ChartCard title="Mis cuotas" subtitle="Estado de todas mis cuotas" href="/alumno/payments" hrefLabel="Ver pagos" empty={payTotal === 0} emptyText="Todavía no tenés cuotas registradas">
          <DonutChart
            height={130}
            centerLabel="cuotas"
            data={[
              { label: "Pagadas", value: p.paymentSummary.pagadas, color: COLORS.green },
              { label: "Por vencer", value: p.paymentSummary.porVencer, color: COLORS.amber },
              { label: "Vencidas", value: p.paymentSummary.vencidas, color: COLORS.red },
            ]}
          />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Mi asistencia por mes"
          subtitle="% de clases a las que fui (presente o tarde)"
          empty={p.attendanceByMonth.every((m) => m.asistencia === null)}
          emptyText="Todavía no tenés asistencia registrada en los últimos 6 meses"
        >
          <TrendChart
            data={p.attendanceByMonth}
            xKey="mes"
            format="percent"
            yDomain={[0, 100]}
            height={210}
            series={[{ key: "asistencia", label: "Asistencia", color: COLORS.brand }]}
            referenceLine={{ y: 80, label: "mínimo 80%" }}
          />
        </ChartCard>

        <ChartCard title="Evolución de mis notas" subtitle="Mis últimas notas · línea verde = aprobación (7)" empty={p.gradesTimeline.length === 0} emptyText="Todavía no tenés notas cargadas">
          <TrendChart
            kind="line"
            data={p.gradesTimeline}
            xKey="fecha"
            format="grade"
            yDomain={[1, 10]}
            height={210}
            series={[{ key: "nota", label: "Nota", color: COLORS.violet }]}
            referenceLine={{ y: 7, label: "aprobación" }}
          />
        </ChartCard>

        <ChartCard
          title="Mi promedio vs. el del curso"
          subtitle="Cómo voy comparado con mis compañeros en cada curso"
          empty={p.gradesVsCourse.length === 0}
          emptyText="Todavía no hay notas para comparar"
        >
          <BarsChart
            data={p.gradesVsCourse}
            xKey="curso"
            format="grade"
            domain={[0, 10]}
            height={210}
            series={[
              { key: "yo", label: "Mi promedio", color: COLORS.brand },
              { key: "curso_promedio", label: "Promedio del curso", color: COLORS.slate },
            ]}
          />
        </ChartCard>

        <ChartCard
          title="Mis autoevaluaciones"
          subtitle="Puntaje (0 a 100) de las que ya rendí"
          href="/alumno/assessments"
          hrefLabel="Ver todas"
          empty={p.assessmentScores.length === 0}
          emptyText="Todavía no rendiste ninguna autoevaluación"
        >
          <BarsChart
            data={withColor(p.assessmentScores, (s) => attendanceColor(s.puntaje))}
            xKey="evaluacion"
            layout="vertical"
            format="number"
            domain={[0, 100]}
            categoryWidth={110}
            showLabels
            height={Math.max(160, p.assessmentScores.length * 36 + 40)}
            series={[{ key: "puntaje", label: "Puntaje" }]}
            colorKey="color"
          />
        </ChartCard>
      </div>
    </div>
  );
}
