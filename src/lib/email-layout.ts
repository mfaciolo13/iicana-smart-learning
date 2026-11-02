// Marco visual y escape de los emails de Smart Learning. Sin dependencias de envío: se puede
// importar en tests y en código que solo arma HTML.

/** Escapa texto de usuario antes de interpolarlo en el HTML del email (SCRUM-325). */
export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}


export function emailShell(body: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#1b3356,#2d5383);padding:32px 40px;">
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

