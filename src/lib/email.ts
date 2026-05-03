import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM_EMAIL ?? "IICANA <noreply@iicana.edu.ar>";
const IS_DEV = process.env.NODE_ENV === "development";

const ROLE_LABELS: Record<string, string> = {
  alumno: "alumno/a",
  profesor: "docente",
  tutor: "tutor/a",
};

export async function sendInvitationEmail({
  to,
  fullName,
  role,
  inviteLink,
}: {
  to: string;
  fullName: string;
  role: string;
  inviteLink: string;
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
    subject: "Tu acceso a IICANA Smart Learning",
    html: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:32px 40px;">
            <p style="margin:0;color:#bfdbfe;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">IICANA Smart Learning</p>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700;">Bienvenido/a a la plataforma</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 16px;color:#1e293b;font-size:15px;">Hola <strong>${firstName}</strong>,</p>
            <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
              Tu cuenta de <strong>${roleLabel}</strong> en IICANA Smart Learning fue creada por el equipo administrativo.
            </p>
            <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6;">
              Para ingresar por primera vez y establecer tu contraseña, usá el <strong>link de acceso que el administrador te va a enviar por separado</strong> (por WhatsApp u otro medio).
            </p>
            <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.5;">
              Si no esperabas este email, podés ignorarlo con seguridad.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #f1f5f9;">
            <p style="margin:0;color:#cbd5e1;font-size:12px;">IICANA — Instituto de Intercambio Cultural Argentino Norteamericano</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}
