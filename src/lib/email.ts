import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM_EMAIL ?? "Smart Learning <no-reply@cervantes-smart-learning.com.ar>";
const IS_DEV = process.env.NODE_ENV === "development";

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

  await resend.emails.send({
    from: FROM,
    to,
    subject: "Tu acceso a Smart Learning",
    html: emailShell(`
      <p style="margin:0 0 16px;color:#1e293b;font-size:15px;">Hola <strong>${firstName}</strong>,</p>
      <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
        Tu cuenta de <strong>${roleLabel}</strong> en Smart Learning fue creada por el equipo administrativo.
        Para ingresar por primera vez, establecé tu contraseña haciendo clic en el botón de abajo.
      </p>
      <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6;">El link no expira hasta que lo uses.</p>
      <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
        <tr>
          <td style="background:#1d4ed8;border-radius:8px;">
            <a href="${inviteLink}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
              Establecer mi contraseña →
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.5;">
        Si no esperabas este email, podés ignorarlo.<br />
        Si el botón no funciona, copiá este link: <a href="${inviteLink}" style="color:#3b82f6;word-break:break-all;">${inviteLink}</a>
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
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Te inscribieron en ${courseName} — Smart Learning`,
    html: emailShell(`
      <p style="margin:0 0 16px;color:#1e293b;font-size:15px;">Hola <strong>${firstName}</strong>,</p>
      <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
        Te informamos que fuiste inscripto/a en el siguiente curso:
      </p>
      <div style="background:#f1f5f9;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
        <p style="margin:0 0 6px;color:#1e293b;font-size:15px;font-weight:600;">${courseName}</p>
        <p style="margin:0;color:#475569;font-size:13px;">Horario: ${courseSchedule}</p>
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
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Te asignaron al curso ${courseName} — Smart Learning`,
    html: emailShell(`
      <p style="margin:0 0 16px;color:#1e293b;font-size:15px;">Hola <strong>${firstName}</strong>,</p>
      <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
        Te asignaron como docente del siguiente curso:
      </p>
      <div style="background:#f1f5f9;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
        <p style="margin:0 0 6px;color:#1e293b;font-size:15px;font-weight:600;">${courseName}</p>
        <p style="margin:0;color:#475569;font-size:13px;">Horario: ${courseSchedule}</p>
      </div>
      <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">
        Ingresá a Smart Learning para ver el detalle del curso.
      </p>
    `),
  });
}

export async function sendInstitutionalNotificationEmail({
  to,
  fullName,
  title,
  body,
}: {
  to: string;
  fullName: string;
  title: string;
  body: string;
}) {
  if (IS_DEV) {
    console.log(`\n📧 [DEV] Notification email for ${to} — "${title}"\n`);
    return;
  }
  const firstName = fullName.split(" ")[0];
  await resend.emails.send({
    from: FROM,
    to,
    subject: `${title} — Smart Learning`,
    html: emailShell(`
      <p style="margin:0 0 16px;color:#1e293b;font-size:15px;">Hola <strong>${firstName}</strong>,</p>
      <p style="margin:0 0 8px;color:#1e293b;font-size:15px;font-weight:600;">${title}</p>
      <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">${body}</p>
      <p style="margin:0;color:#94a3b8;font-size:12px;">Podés ver esta notificación en Smart Learning.</p>
    `),
  });
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
  await resend.emails.send({
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
            <a href="${resetLink}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
              Restablecer mi contraseña →
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.5;">
        Si el botón no funciona, copiá este link: <a href="${resetLink}" style="color:#3b82f6;word-break:break-all;">${resetLink}</a>
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
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Ausencia registrada en ${courseName} — Smart Learning`,
    html: emailShell(`
      <p style="margin:0 0 16px;color:#1e293b;font-size:15px;">Hola <strong>${firstName}</strong>,</p>
      <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
        Te informamos que registramos tu ausencia en el siguiente curso:
      </p>
      <div style="background:#f1f5f9;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
        <p style="margin:0 0 6px;color:#1e293b;font-size:15px;font-weight:600;">${courseName}</p>
        <p style="margin:0 0 4px;color:#475569;font-size:13px;">Fecha: ${new Date(classDate).toLocaleDateString("es-AR")}</p>
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
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Nueva nota publicada en ${courseName} — Smart Learning`,
    html: emailShell(`
      <p style="margin:0 0 16px;color:#1e293b;font-size:15px;">Hola <strong>${firstName}</strong>,</p>
      <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
        Se publicó una nueva nota en tu curso:
      </p>
      <div style="background:#f1f5f9;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
        <p style="margin:0 0 4px;color:#475569;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">${courseName} · ${evaluationTypeLabel}</p>
        <p style="margin:0;color:#1e293b;font-size:24px;font-weight:700;">${score}<span style="font-size:14px;font-weight:400;color:#94a3b8;">/10</span></p>
      </div>
      <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">
        Ingresá a Smart Learning para ver el detalle de tus notas.
      </p>
    `),
  });
}

export async function sendAssessmentPublishedEmail({
  to,
  fullName,
  courseName,
  topic,
  weekLabel,
}: {
  to: string;
  fullName: string;
  courseName: string;
  topic: string;
  weekLabel: string;
}) {
  if (IS_DEV) {
    console.log(`\n📧 [DEV] Assessment email for ${to} — ${topic}\n`);
    return;
  }
  const firstName = fullName.split(" ")[0];
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Nueva autoevaluación disponible — Smart Learning`,
    html: emailShell(`
      <p style="margin:0 0 16px;color:#1e293b;font-size:15px;">Hola <strong>${firstName}</strong>,</p>
      <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
        Hay una nueva autoevaluación disponible en tu curso:
      </p>
      <div style="background:#f1f5f9;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
        <p style="margin:0 0 4px;color:#475569;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">${courseName} · ${weekLabel}</p>
        <p style="margin:0;color:#1e293b;font-size:15px;font-weight:600;">${topic}</p>
      </div>
      <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">
        Ingresá a Smart Learning para realizarla cuando quieras.
      </p>
    `),
  });
}
