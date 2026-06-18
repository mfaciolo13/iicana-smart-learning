import { FormButton } from "@/components/ui/FormButton";
import {
  runRiskDetectionAction,
  runDailyReportAction,
  runOverdueAlertAction,
  runPaymentReminderAction,
  runClassReminderAction,
} from "@/modules/automations/actions";
import {
  ShieldAlert,
  BarChart2,
  AlertTriangle,
  CreditCard,
  CalendarCheck,
  Clock,
  Info,
} from "lucide-react";
import type { ActionResult } from "@/lib/action-result";

type CronAction = (prev: ActionResult, fd: FormData) => Promise<ActionResult>;

interface AutomationDef {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  schedule: string;
  action: CronAction;
  confirmMessage: string;
}

const AUTOMATIONS: AutomationDef[] = [
  {
    icon: ShieldAlert,
    iconColor: "text-red-600",
    iconBg: "bg-red-50",
    title: "Detección de riesgo de abandono",
    description:
      "Evalúa cada alumno activo cruzando 3 señales: pagos vencidos, asistencia < 70% y promedio de autoevaluaciones < 60%. Actualiza el panel de riesgo.",
    schedule: "Automático: todos los días a las 06:00",
    action: runRiskDetectionAction,
    confirmMessage: "¿Ejecutar detección de riesgo ahora? Esto actualizará el estado de riesgo de todos los alumnos activos.",
  },
  {
    icon: BarChart2,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
    title: "Reporte diario a directores",
    description:
      "Envía un email con el resumen del día anterior: pagos cobrados por método, alumnos con asistencia baja y nuevas inscripciones.",
    schedule: "Automático: todos los días a las 07:00",
    action: runDailyReportAction,
    confirmMessage: "¿Enviar el reporte diario ahora a todos los directores?",
  },
  {
    icon: AlertTriangle,
    iconColor: "text-orange-600",
    iconBg: "bg-orange-50",
    title: "Alerta de pago vencido",
    description:
      "Envía email a los alumnos con cuotas vencidas que aún no recibieron alerta. Si un alumno tiene 2 o más vencidas, restringe el acceso a su portal.",
    schedule: "Automático: todos los días a las 08:00",
    action: runOverdueAlertAction,
    confirmMessage: "¿Ejecutar alerta de morosidad ahora? Los alumnos con pagos vencidos recibirán un email y los que tengan 2+ vencidos verán su acceso restringido.",
  },
  {
    icon: CreditCard,
    iconColor: "text-violet-600",
    iconBg: "bg-violet-50",
    title: "Recordatorio de vencimiento de cuota",
    description:
      "Envía un recordatorio preventivo a los alumnos cuya cuota vence pronto, antes de que llegue a estado vencido.",
    schedule: "Automático: todos los días a las 09:00",
    action: runPaymentReminderAction,
    confirmMessage: "¿Enviar recordatorios de vencimiento ahora?",
  },
  {
    icon: CalendarCheck,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
    title: "Recordatorio de clase",
    description:
      "Envía un email a los alumnos y docentes recordándoles la clase del día siguiente según el horario de cada curso.",
    schedule: "Automático: todos los días a las 20:00",
    action: runClassReminderAction,
    confirmMessage: "¿Enviar recordatorios de clase de mañana ahora?",
  },
];

export default function AutomationsPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Automatizaciones</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Ejecutá manualmente cualquier proceso automático del sistema.
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-8">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-700">
          Estos procesos se ejecutan automáticamente en Vercel según el horario indicado.
          Podés dispararlos manualmente en cualquier momento — útil para probar o forzar
          un envío fuera del horario programado.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {AUTOMATIONS.map((a) => {
          const Icon = a.icon;
          return (
            <div
              key={a.title}
              className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4 shadow-sm"
            >
              {/* Header */}
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg ${a.iconBg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${a.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 leading-snug">{a.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{a.description}</p>
                </div>
              </div>

              {/* Schedule */}
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>{a.schedule}</span>
              </div>

              {/* Action */}
              <div className="pt-1 border-t border-slate-100">
                <FormButton
                  action={a.action}
                  variant="secondary"
                  size="sm"
                  confirmMessage={a.confirmMessage}
                  className="w-full justify-center"
                >
                  Ejecutar ahora
                </FormButton>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
