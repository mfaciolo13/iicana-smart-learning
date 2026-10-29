import { Suspense } from "react";
import Link from "next/link";
import { Plus, BookOpen, CalendarCheck, PenLine, CreditCard, BarChart2 } from "lucide-react";
import { getServerProfile } from "@/lib/auth/helpers";
import { hourInstitute } from "@/lib/format";
import { ChartSkeleton } from "@/components/charts/ChartCard";
import { FinancePanel } from "@/components/analytics/FinancePanel";
import { AcademicPanel } from "@/components/analytics/AcademicPanel";
import { PeoplePanel } from "@/components/analytics/PeoplePanel";
import { QualityPanel } from "@/components/analytics/QualityPanel";
import { KpiSection, KpiSkeleton } from "./components/KpiSection";
import { ActivityFeed } from "./components/ActivityFeed";
import { LevelCharts } from "./components/LevelCharts";

const quickActions = [
  { label: "Nuevo alumno", href: "/director/students/new", icon: Plus, desc: "Registrar un alumno" },
  { label: "Nuevo curso", href: "/director/courses/new", icon: BookOpen, desc: "Crear curso" },
  { label: "Asistencia", href: "/director/attendance", icon: CalendarCheck, desc: "Registrar clase" },
  { label: "Cargar notas", href: "/director/grades", icon: PenLine, desc: "Ingresar notas" },
  { label: "Registrar pago", href: "/director/payments/new", icon: CreditCard, desc: "Cobrar cuota" },
  { label: "Reportes", href: "/director/reports", icon: BarChart2, desc: "Ver estadísticas" },
];

function SectionTitle({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="pt-2">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <p className="text-xs text-slate-400">{hint}</p>
    </div>
  );
}

const threeCharts = (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
    <ChartSkeleton height={190} />
    <ChartSkeleton height={190} />
    <ChartSkeleton height={190} />
  </div>
);
const twoCharts = (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <ChartSkeleton />
    <ChartSkeleton />
  </div>
);

/**
 * Panel del director. El encabezado sale al instante y cada sección carga por su cuenta
 * (Suspense): la página ya no espera a la consulta más lenta. Los gráficos se cachean 60 s.
 */
export default async function DirectorDashboardPage() {
  const profile = await getServerProfile();

  const now = new Date();
  const hour = hourInstitute(now);
  const greeting = hour < 12 ? "Buenos días" : hour < 18 ? "Buenas tardes" : "Buenas noches";
  const firstName = profile?.full_name?.split(" ")[0] ?? "Administrador";
  const dateStr = now.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const dateFormatted = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div>
        <p className="text-sm text-slate-400">{dateFormatted}</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-0.5">
          {greeting}, {firstName}
        </h1>
      </div>

      <Suspense fallback={<KpiSkeleton />}>
        <KpiSection />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Accesos rápidos</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group flex flex-col gap-2 p-3.5 rounded-xl border border-slate-100 hover:border-brand-200 hover:bg-brand-50/50 transition-all"
                >
                  <Icon className="w-5 h-5 text-slate-400 group-hover:text-brand-600 transition-colors" strokeWidth={1.5} />
                  <div>
                    <p className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">{action.label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{action.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <Suspense fallback={<ChartSkeleton height={240} />}>
          <ActivityFeed />
        </Suspense>
      </div>

      <SectionTitle title="Finanzas" hint="Cobranza de los últimos 6 meses y deuda pendiente" />
      <Suspense fallback={threeCharts}>
        <FinancePanel paymentsHref="/director/payments" />
      </Suspense>

      <SectionTitle title="Académico" hint="Asistencia, notas y ocupación de cursos" />
      <Suspense fallback={twoCharts}>
        <AcademicPanel />
      </Suspense>

      <SectionTitle title="Alumnos" hint="Altas, estado de los alumnos y riesgo de abandono" />
      <Suspense fallback={threeCharts}>
        <PeoplePanel riskHref="/director/risk" />
      </Suspense>

      <SectionTitle title="Calidad y atención" hint="Evaluación docente, reclamos y consultas de marketing" />
      <Suspense fallback={threeCharts}>
        <QualityPanel />
      </Suspense>

      <SectionTitle title="Por curso y por nivel" hint="Asistencia y notas por curso, filtrables por nivel de inglés" />
      <Suspense fallback={twoCharts}>
        <LevelCharts />
      </Suspense>
    </div>
  );
}
