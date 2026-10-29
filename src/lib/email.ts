import { Resend } from "resend";
import { formatDateAR } from "@/lib/format";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM_EMAIL ?? "Smart Learning <no-reply@cervantes-smart-learning.com.ar>";
const IS_DEV = process.env.NODE_ENV === "development";

/** Escapa texto de usuario antes de interpolarlo en el HTML del email (SCRUM-325). */
function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Resend no lanza cuando el envío falla: devuelve { error }. Se convierte en excepción para que
 * los llamadores (crons, alertas) cuenten el fallo en lugar de marcar el aviso como enviado (SCRUM-304).
 */
async function sendOrThrow(payload: Parameters<typeof resend.emails.send>[0]): Promise<void> {
  const { error } = await resend.emails.send(payload);
  if (error) throw new Error(`Resend: ${error.message}`);
}

type EmailPayload = Parameters<typeof resend.emails.send>[0];
type Recipient = { email: string; fullName: string };

// Resend admite hasta 100 emails por request de batch y limita a 10 requests/s: mandar un
// email por destinatario en paralelo hace que los envíos masivos se corten con 429.
const BATCH_LIMIT = 100;

async function sendBatchOrThrow(payloads: EmailPayload[]): Promise<void> {
  for (let i = 0; i < payloads.length; i += BATCH_LIMIT) {
    const { error } = await resend.batch.send(payloads.slice(i, i + BATCH_LIMIT));
    if (error) throw new Error(`Resend: ${error.message}`);
  }
}

const ROLE_LABELS: Record<string, string> = {
  alumno: "alumno/a",
  profesor: "docente",
};

function emailShell(body: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:32px 40px;">
            <p style="margin:0;color:#bfdbfe;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">Smart Learning</p>
          </td>
        </tr>
        <tr><td style="padding:36px 40px;">${body}</td></tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #f1f5f9;">
            <p style="margin:0;color:#cbd5e1;font-size:12px;">Smart Learning — Sistema de Gestión Académica</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendInvitationEmail({
  to,
  fullName,
  role,
  inviteLink,
}: {
  to: string;
  fullName: string;
  role: string;
  inviteLink: string; // safe /invite/[encoded] URL, not a raw Supabase OTP link
}) {
  if (IS_DEV) {
    console.log(`\n📧 [DEV] Invitation email for ${to}\n🔗 Link: ${inviteLink}\n`);
    return;
  }
  const roleLabel = ROLE_LABELS[role] ?? role;
  const firstName = fullName.split(" ")[0];

  await sendOrThrow({
    from: FROM,
    to,
    subject: "Tu acceso a Smart Learning",
    html: emailShell(`
      <p style="margin:0 0 16px;color:#1e293b;font-size:15px;">Hola <strong>${esc(firstName)}</strong>,</p>
      <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
        Tu cuenta de <strong>${roleLabel}</strong> en Smart Learning fue creada por el equipo administrativo.
        Para ingresar por primera vez, establecé tu contraseña haciendo clic en el botón de abajo.
      </p>
      <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6;">El link no expira hasta que lo uses.</p>
      <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
        <tr>
          <td style="background:#1d4ed8;border-radius:8px;">
            <a href="${esc(inviteLink)}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
              Establecer mi contraseña →
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.5;">
        Si no esperabas este email, podés ignorarlo.<br />
        Si el botón no funciona, copiá este link: <a href="${esc(inviteLink)}" style="color:#3b82f6;word-break:break-all;">${esc(inviteLink)}</a>
      </p>
    `),
  });
}

export async function sendEnrollmentEmail({
  to,
  fullName,
  courseName,
  courseSchedule,
}: {
  to: string;
  fullName: string;
  courseName: string;
  courseSchedule: string;
}) {
  if (IS_DEV) {
    console.log(`\n📧 [DEV] Enrollment email for ${to} — curso: ${courseName}\n`);
    return;
  }
  const firstName = fullName.split(" ")[0];
  await sendOrThrow({
    from: FROM,
    to,
    subject: `Te inscribieron en ${courseName} — Smart Learning`,
    html: emailShell(`
      <p style="margin:0 0 16px;color:#1e293b;font-size:15px;">Hola <strong>${esc(firstName)}</strong>,</p>
      <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
        Te informamos que fuiste inscripto/a en el siguiente curso:
      </p>
      <div style="background:#f1f5f9;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
        <p style="margin:0 0 6px;color:#1e293b;font-size:15px;font-weight:600;">${esc(courseName)}</p>
        <p style="margin:0;color:#475569;font-size:13px;">Horario: ${esc(courseSchedule)}</p>
      </div>
      <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">
        Ingresá a Smart Learning para ver el detalle de tu inscripción.
      </p>
    `),
  });
}

export async function sendTeacherAssignmentEmail({
  to,
  fullName,
  courseName,
  courseSchedule,
}: {
  to: string;
  fullName: string;
  courseName: string;
  courseSchedule: string;
}) {
  if (IS_DEV) {
    console.log(`\n📧 [DEV] Teacher assignment email for ${to} — curso: ${courseName}\n`);
    return;
  }
  const firstName = fullName.split(" ")[0];
  await sendOrThrow({
    from: FROM,
    to,
    subject: `Te asignaron al curso ${courseName} — Smart Learning`,
    html: emailShell(`
      <p style="margin:0 0 16px;color:#1e293b;font-size:15px;">Hola <strong>${esc(firstName)}</strong>,</p>
      <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
        Te asignaron como docente del siguiente curso:
      </p>
      <div style="background:#f1f5f9;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
        <p style="margin:0 0 6px;color:#1e293b;font-size:15px;font-weight:600;">${esc(courseName)}</p>
        <p style="margin:0;color:#475569;font-size:13px;">Horario: ${esc(courseSchedule)}</p>
      </div>
      <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">
        Ingresá a Smart Learning para ver el detalle del curso.
      </p>
    `),
  });
}

function institutionalNotificationPayload({
  to,
  fullName,
  title,
  body,
}: {
  to: string;
  fullName: string;
  title: string;
  body: string;
}): EmailPayload {
  const firstName = fullName.split(" ")[0];
  return {
    from: FROM,
    to,
    subject: `${title} — Smart Learning`,
    html: emailShell(`
      <p style="margin:0 0 16px;color:#1e293b;font-size:15px;">Hola <strong>${esc(firstName)}</strong>,</p>
      <p style="margin:0 0 8px;color:#1e293b;font-size:15px;font-weight:600;">${esc(title)}</p>
      <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">${esc(body)}</p>
      <p style="margin:0;color:#94a3b8;font-size:12px;">Podés ver esta notificación en Smart Learning.</p>
    `),
  };
}

export async function sendInstitutionalNotificationEmail(params: {
  to: string;
  fullName: string;
  title: string;
  body: string;
}) {
  if (IS_DEV) {
    console.log(`\n📧 [DEV] Notification email for ${params.to} — "${params.title}"\n`);
    return;
  }
  await sendOrThrow(institutionalNotificationPayload(params));
}

export async function sendInstitutionalNotificationEmails({
  recipients,
  title,
  body,
}: {
  recipients: Recipient[];
  title: string;
  body: string;
}) {
  if (IS_DEV) {
    console.log(`\n📧 [DEV] Notification email for ${recipients.length} recipients — "${title}"\n`);
    return;
  }
  await sendBatchOrThrow(
    recipients.map((r) => institutionalNotificationPayload({ to: r.email, fullName: r.fullName, title, body }))
  );
}

export async function sendPasswordResetEmail({
  to,
  resetLink,
}: {
  to: string;
  resetLink: string;
}) {
  if (IS_DEV) {
    console.log(`\n📧 [DEV] Password reset email for ${to}\n🔗 Link: ${resetLink}\n`);
    return;
  }
  await sendOrThrow({
    from: FROM,
    to,
    subject: "Restablecer contraseña — Smart Learning",
    html: emailShell(`
      <p style="margin:0 0 16px;color:#1e293b;font-size:15px;">Hola,</p>
      <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
        Recibimos una solicitud para restablecer la contraseña de tu cuenta en Smart Learning.
        Hacé clic en el botón de abajo para elegir una nueva contraseña.
      </p>
      <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6;">
        El link expira en <strong>1 hora</strong>. Si no solicitaste este cambio, podés ignorar este email.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
        <tr>
          <td style="background:#1d4ed8;border-radius:8px;">
            <a href="${esc(resetLink)}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
              Restablecer mi contraseña →
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.5;">
        Si el botón no funciona, copiá este link: <a href="${esc(resetLink)}" style="color:#3b82f6;word-break:break-all;">${esc(resetLink)}</a>
      </p>
    `),
  });
}

export async function sendAbsenceAlertEmail({
  to,
  fullName,
  courseName,
  classDate,
  attendancePercentage,
}: {
  to: string;
  fullName: string;
  courseName: string;
  classDate: string;
  attendancePercentage: number;
}) {
  if (IS_DEV) {
    console.log(`\n📧 [DEV] Absence alert email for ${to} — curso: ${courseName}\n`);
    return;
  }
  const firstName = fullName.split(" ")[0];
  await sendOrThrow({
    from: FROM,
    to,
    subject: `Ausencia registrada en ${courseName} — Smart Learning`,
    html: emailShell(`
      <p style="margin:0 0 16px;color:#1e293b;font-size:15px;">Hola <strong>${esc(firstName)}</strong>,</p>
      <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
        Te informamos que registramos tu ausencia en el siguiente curso:
      </p>
      <div style="background:#f1f5f9;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
        <p style="margin:0 0 6px;color:#1e293b;font-size:15px;font-weight:600;">${esc(courseName)}</p>
        <p style="margin:0 0 4px;color:#475569;font-size:13px;">Fecha: ${formatDateAR(classDate)}</p>
        <p style="margin:0;color:#475569;font-size:13px;">Asistencia acumulada: ${attendancePercentage}%</p>
      </div>
      <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">
        Recordá que se requiere un mínimo de 80% de asistencia para promocionar el curso.
      </p>
    `),
  });
}

export async function sendGradePublishedEmail({
  to,
  fullName,
  courseName,
  evaluationTypeLabel,
  score,
}: {
  to: string;
  fullName: string;
  courseName: string;
  evaluationTypeLabel: string;
  score: number;
}) {
  if (IS_DEV) {
    console.log(`\n📧 [DEV] Grade published email for ${to} — curso: ${courseName}\n`);
    return;
  }
  const firstName = fullName.split(" ")[0];
  await sendOrThrow({
    from: FROM,
    to,
    subject: `Nueva nota publicada en ${courseName} — Smart Learning`,
    html: emailShell(`
      <p style="margin:0 0 16px;color:#1e293b;font-size:15px;">Hola <strong>${esc(firstName)}</strong>,</p>
      <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
        Se publicó una nueva nota en tu curso:
      </p>
      <div style="background:#f1f5f9;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
        <p style="margin:0 0 4px;color:#475569;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">${esc(courseName)} · ${evaluationTypeLabel}</p>
        <p style="margin:0;color:#1e293b;font-size:24px;font-weight:700;">${score}<span style="font-size:14px;font-weight:400;color:#94a3b8;">/10</span></p>
      </div>
      <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">
        Ingresá a Smart Learning para ver el detalle de tus notas.
      </p>
    `),
  });
}

export async function sendClassReminderEmail({
  to,
  fullName,
  courseName,
  classDate,
  classTime,
}: {
  to: string;
  fullName: string;
  courseName: string;
  classDate: string;
  classTime: string;
}) {
  if (IS_DEV) {
    console.log(`\n📧 [DEV] Class reminder email for ${to} — ${courseName} mañana ${classTime}\n`);
    return;
  }
  const firstName = fullName.split(" ")[0];
  const formattedDate = new Date(classDate).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  await sendOrThrow({
    from: FROM,
    to,
    subject: `Recordatorio de clase mañana — ${courseName}`,
    html: emailShell(`
      <p style="margin:0 0 16px;color:#1e293b;font-size:15px;">Hola <strong>${esc(firstName)}</strong>,</p>
      <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
        Te recordamos que mañana tenés clase en Smart Learning:
      </p>
      <div style="background:#f1f5f9;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
        <p style="margin:0 0 6px;color:#1e293b;font-size:15px;font-weight:600;">${esc(courseName)}</p>
        <p style="margin:0 0 4px;color:#475569;font-size:13px;">📅 ${formattedDate}</p>
        <p style="margin:0;color:#475569;font-size:13px;">🕐 ${classTime} hs</p>
      </div>
      <p style="margin:0;color:#94a3b8;font-size:12px;">
        Ingresá a Smart Learning para ver el material de la clase.
      </p>
    `),
  });
}

export async function sendPaymentReminderEmail({
  to,
  fullName,
  courseName,
  dueDate,
  amount,
}: {
  to: string;
  fullName: string;
  courseName: string;
  dueDate: string;
  amount: number;
}) {
  if (IS_DEV) {
    console.log(`\n📧 [DEV] Payment reminder email for ${to} — $${amount} vence ${dueDate}\n`);
    return;
  }
  const firstName = fullName.split(" ")[0];
  const formattedDate = new Date(dueDate).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const formattedAmount = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount);
  await sendOrThrow({
    from: FROM,
    to,
    subject: `Recordatorio de pago — ${courseName}`,
    html: emailShell(`
      <p style="margin:0 0 16px;color:#1e293b;font-size:15px;">Hola <strong>${esc(firstName)}</strong>,</p>
      <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
        Tu cuota mensual está próxima a vencer. Podés abonarla en el instituto antes de la fecha límite.
      </p>
      <div style="background:#f1f5f9;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
        <p style="margin:0 0 6px;color:#1e293b;font-size:15px;font-weight:600;">${esc(courseName)}</p>
        <p style="margin:0 0 4px;color:#475569;font-size:13px;">Importe: <strong>${formattedAmount}</strong></p>
        <p style="margin:0;color:#475569;font-size:13px;">Vencimiento: <strong>${formattedDate}</strong></p>
      </div>
      <p style="margin:0;color:#94a3b8;font-size:12px;">
        Ante cualquier consulta, comunicate con el equipo administrativo de Smart Learning.
      </p>
    `),
  });
}

export async function sendDailyReportEmail({
  to,
  date,
  paymentsSummary,
  paymentsTotal,
  lowAttendanceStudents,
  newStudents,
}: {
  to: string;
  date: string;
  paymentsSummary: { method: string; count: number; total: number }[];
  paymentsTotal: number;
  lowAttendanceStudents: { studentName: string; courseName: string; attendancePct: number }[];
  newStudents: { fullName: string; courseName: string }[];
}) {
  if (IS_DEV) {
    console.log(`\n📧 [DEV] Daily report email for ${to} — ${date}\n`);
    return;
  }

  const formattedDate = new Date(date).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const formattedTotal = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(paymentsTotal);

  const paymentsRows = paymentsSummary.length > 0
    ? paymentsSummary.map((p) => {
        const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(p.total);
        return `<tr><td style="padding:6px 12px;color:#475569;font-size:13px;">${p.method}</td><td style="padding:6px 12px;color:#475569;font-size:13px;text-align:center;">${p.count}</td><td style="padding:6px 12px;color:#1e293b;font-size:13px;font-weight:600;text-align:right;">${fmt}</td></tr>`;
      }).join("")
    : `<tr><td colspan="3" style="padding:12px;color:#94a3b8;font-size:13px;text-align:center;">Sin cobros registrados</td></tr>`;

  const lowAttRows = lowAttendanceStudents.length > 0
    ? lowAttendanceStudents.map((s) => `<tr><td style="padding:6px 12px;color:#b45309;font-size:13px;">${esc(s.studentName)}</td><td style="padding:6px 12px;color:#475569;font-size:13px;">${esc(s.courseName)}</td><td style="padding:6px 12px;color:#dc2626;font-size:13px;font-weight:600;text-align:right;">${s.attendancePct}%</td></tr>`).join("")
    : `<tr><td colspan="3" style="padding:12px;color:#94a3b8;font-size:13px;text-align:center;">Ningún alumno en situación crítica</td></tr>`;

  const newStudentRows = newStudents.length > 0
    ? newStudents.map((s) => `<tr><td style="padding:6px 12px;color:#475569;font-size:13px;">${esc(s.fullName)}</td><td style="padding:6px 12px;color:#475569;font-size:13px;">${esc(s.courseName)}</td></tr>`).join("")
    : `<tr><td colspan="2" style="padding:12px;color:#94a3b8;font-size:13px;text-align:center;">Sin inscripciones nuevas</td></tr>`;

  const tableStyle = `width:100%;border-collapse:collapse;margin:0 0 24px;`;
  const thStyle = `padding:6px 12px;background:#f8fafc;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;text-align:left;border-bottom:1px solid #e2e8f0;`;

  await sendOrThrow({
    from: FROM,
    to,
    subject: `Resumen del día — ${formattedDate}`,
    html: emailShell(`
      <p style="margin:0 0 4px;color:#1e293b;font-size:16px;font-weight:700;">Resumen del día</p>
      <p style="margin:0 0 24px;color:#94a3b8;font-size:13px;">${formattedDate}</p>

      <p style="margin:0 0 8px;color:#1e293b;font-size:14px;font-weight:600;">Cobros del día</p>
      <p style="margin:0 0 12px;color:#475569;font-size:13px;">Total recaudado: <strong>${formattedTotal}</strong></p>
      <table style="${tableStyle}">
        <thead><tr><th style="${thStyle}">Método</th><th style="${thStyle};text-align:center;">Cantidad</th><th style="${thStyle};text-align:right;">Total</th></tr></thead>
        <tbody>${paymentsRows}</tbody>
      </table>

      <p style="margin:0 0 12px;color:#1e293b;font-size:14px;font-weight:600;">Alumnos con asistencia &lt; 70%</p>
      <table style="${tableStyle}">
        <thead><tr><th style="${thStyle}">Alumno</th><th style="${thStyle}">Curso</th><th style="${thStyle};text-align:right;">Asistencia</th></tr></thead>
        <tbody>${lowAttRows}</tbody>
      </table>

      <p style="margin:0 0 12px;color:#1e293b;font-size:14px;font-weight:600;">Inscripciones nuevas</p>
      <table style="${tableStyle}">
        <thead><tr><th style="${thStyle}">Alumno</th><th style="${thStyle}">Curso</th></tr></thead>
        <tbody>${newStudentRows}</tbody>
      </table>
    `),
  });
}

const RISK_LEVEL_LABELS: Record<string, { label: string; color: string }> = {
  high: { label: "Alto", color: "#dc2626" },
  medium: { label: "Medio", color: "#d97706" },
  low: { label: "Bajo", color: "#2563eb" },
};

export async function sendRiskDetectionReportEmail({
  to,
  date,
  assessed,
  atRiskStudents,
  panelUrl,
}: {
  to: string;
  date: string;
  assessed: number;
  atRiskStudents: { studentName: string; riskLevel: string; signals: string[] }[];
  panelUrl: string;
}) {
  if (IS_DEV) {
    console.log(`\n📧 [DEV] Risk detection report for ${to} — evaluados=${assessed} enRiesgo=${atRiskStudents.length}\n`);
    return;
  }

  const rows = atRiskStudents.length > 0
    ? atRiskStudents.map((s) => {
        const level = RISK_LEVEL_LABELS[s.riskLevel] ?? { label: s.riskLevel, color: "#475569" };
        return `<tr><td style="padding:6px 12px;color:#1e293b;font-size:13px;">${esc(s.studentName)}</td><td style="padding:6px 12px;color:${level.color};font-size:13px;font-weight:600;">${esc(level.label)}</td><td style="padding:6px 12px;color:#475569;font-size:13px;">${s.signals.map(esc).join("<br />")}</td></tr>`;
      }).join("")
    : `<tr><td colspan="3" style="padding:12px;color:#94a3b8;font-size:13px;text-align:center;">Ningún alumno en riesgo</td></tr>`;

  const thStyle = `padding:6px 12px;background:#f8fafc;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;text-align:left;border-bottom:1px solid #e2e8f0;`;

  await sendOrThrow({
    from: FROM,
    to,
    subject: `Detección de riesgo — ${atRiskStudents.length} alumno${atRiskStudents.length !== 1 ? "s" : ""} en riesgo`,
    html: emailShell(`
      <p style="margin:0 0 4px;color:#1e293b;font-size:16px;font-weight:700;">Detección de riesgo de abandono</p>
      <p style="margin:0 0 24px;color:#94a3b8;font-size:13px;">${formatDateAR(date)}</p>
      <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
        Se evaluaron <strong>${assessed}</strong> alumnos activos. <strong>${atRiskStudents.length}</strong> presentan al menos una señal de riesgo.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
        <thead><tr><th style="${thStyle}">Alumno</th><th style="${thStyle}">Riesgo</th><th style="${thStyle}">Señales</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <a href="${esc(panelUrl)}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;">
        Ver panel de riesgo
      </a>
    `),
  });
}

export async function sendTeacherAttendanceAlertEmail({
  to,
  teacherName,
  studentName,
  courseName,
  attendancePct,
}: {
  to: string;
  teacherName: string;
  studentName: string;
  courseName: string;
  attendancePct: number;
}) {
  if (IS_DEV) {
    console.log(`\n📧 [DEV] Teacher attendance alert for ${to} — ${studentName} en ${courseName}: ${attendancePct}%\n`);
    return;
  }
  const firstName = teacherName.split(" ")[0];
  await sendOrThrow({
    from: FROM,
    to,
    subject: `Alumno con asistencia crítica — ${courseName}`,
    html: emailShell(`
      <p style="margin:0 0 16px;color:#1e293b;font-size:15px;">Hola <strong>${esc(firstName)}</strong>,</p>
      <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
        Te informamos que uno de tus alumnos <strong>bajó por debajo del 70% de asistencia</strong> en tu curso:
      </p>
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
        <p style="margin:0 0 6px;color:#92400e;font-size:15px;font-weight:600;">${esc(studentName)}</p>
        <p style="margin:0 0 4px;color:#b45309;font-size:13px;">Curso: ${esc(courseName)}</p>
        <p style="margin:0;color:#b45309;font-size:13px;">Asistencia actual: <strong>${attendancePct}%</strong></p>
      </div>
      <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">
        Te recomendamos ponerte en contacto con el alumno para evaluar la situación.
        Recordá que se requiere un mínimo de 80% de asistencia para que pueda promocionar el curso.
      </p>
    `),
  });
}

export async function sendPromotionCongratulationsEmail({
  to,
  fullName,
  courseName,
}: {
  to: string;
  fullName: string;
  courseName: string;
}) {
  if (IS_DEV) {
    console.log(`\n📧 [DEV] Promotion congratulations email for ${to} — ${courseName}\n`);
    return;
  }
  const firstName = fullName.split(" ")[0];
  await sendOrThrow({
    from: FROM,
    to,
    subject: `¡Felicitaciones por tu promoción! — Smart Learning`,
    html: emailShell(`
      <p style="margin:0 0 16px;color:#1e293b;font-size:15px;">¡Hola <strong>${esc(firstName)}</strong>!</p>
      <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
        Es un placer comunicarte que <strong>aprobaste exitosamente</strong> el curso de inglés. Felicitaciones por tu esfuerzo y dedicación a lo largo del ciclo lectivo.
      </p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
        <p style="margin:0 0 4px;color:#166534;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Curso aprobado</p>
        <p style="margin:0;color:#15803d;font-size:16px;font-weight:700;">${esc(courseName)}</p>
      </div>
      <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
        Tu certificado de promoción ya está disponible en Smart Learning. Podés descargarlo ingresando a tu portal de alumno.
      </p>
      <p style="margin:0;color:#94a3b8;font-size:12px;">
        ¡Seguí adelante con tu aprendizaje del inglés!
      </p>
    `),
  });
}

export async function sendPaymentOverdueAlertEmail({
  to,
  fullName,
  courseName,
  dueDate,
  amount,
}: {
  to: string;
  fullName: string;
  courseName: string;
  dueDate: string;
  amount: number;
}) {
  if (IS_DEV) {
    console.log(`\n📧 [DEV] Payment OVERDUE alert email for ${to} — $${amount} venció ${dueDate}\n`);
    return;
  }
  const firstName = fullName.split(" ")[0];
  const formattedDate = new Date(dueDate).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const formattedAmount = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount);
  await sendOrThrow({
    from: FROM,
    to,
    subject: `Cuota vencida — ${courseName}`,
    html: emailShell(`
      <p style="margin:0 0 16px;color:#1e293b;font-size:15px;">Hola <strong>${esc(firstName)}</strong>,</p>
      <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
        Tu cuota mensual en Smart Learning se encuentra <strong style="color:#dc2626;">vencida</strong>.
        Te pedimos que te acerques al instituto a regularizar tu situación a la brevedad.
      </p>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
        <p style="margin:0 0 6px;color:#991b1b;font-size:15px;font-weight:600;">${esc(courseName)}</p>
        <p style="margin:0 0 4px;color:#b91c1c;font-size:13px;">Importe: <strong>${formattedAmount}</strong></p>
        <p style="margin:0;color:#b91c1c;font-size:13px;">Venció el: <strong>${formattedDate}</strong></p>
      </div>
      <p style="margin:0;color:#94a3b8;font-size:12px;">
        Ante cualquier consulta, comunicate con el equipo administrativo de Smart Learning.
      </p>
    `),
  });
}

type AssessmentEmailDetail = { courseName: string; topic: string; weekLabel: string };

function assessmentPublishedPayload({
  to,
  fullName,
  courseName,
  topic,
  weekLabel,
}: { to: string; fullName: string } & AssessmentEmailDetail): EmailPayload {
  const firstName = fullName.split(" ")[0];
  return {
    from: FROM,
    to,
    subject: `Nueva autoevaluación disponible — Smart Learning`,
    html: emailShell(`
      <p style="margin:0 0 16px;color:#1e293b;font-size:15px;">Hola <strong>${esc(firstName)}</strong>,</p>
      <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
        Hay una nueva autoevaluación disponible en tu curso:
      </p>
      <div style="background:#f1f5f9;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
        <p style="margin:0 0 4px;color:#475569;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">${esc(courseName)} · ${esc(weekLabel)}</p>
        <p style="margin:0;color:#1e293b;font-size:15px;font-weight:600;">${esc(topic)}</p>
      </div>
      <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">
        Ingresá a Smart Learning para realizarla cuando quieras.
      </p>
    `),
  };
}

export async function sendAssessmentPublishedEmail(params: { to: string; fullName: string } & AssessmentEmailDetail) {
  if (IS_DEV) {
    console.log(`\n📧 [DEV] Assessment email for ${params.to} — ${params.topic}\n`);
    return;
  }
  await sendOrThrow(assessmentPublishedPayload(params));
}

export async function sendAssessmentPublishedEmails({
  recipients,
  ...detail
}: { recipients: Recipient[] } & AssessmentEmailDetail) {
  if (IS_DEV) {
    console.log(`\n📧 [DEV] Assessment email for ${recipients.length} recipients — ${detail.topic}\n`);
    return;
  }
  await sendBatchOrThrow(
    recipients.map((r) => assessmentPublishedPayload({ to: r.email, fullName: r.fullName, ...detail }))
  );
}
