import { AuthShell } from "@/components/shared/AuthShell";
import { ArrowRight, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { verifyInviteToken } from "@/lib/auth/invite-token";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

type InviteState =
  | { status: "ok"; email: string }
  | { status: "invalid" }
  | { status: "used" };

/**
 * Valida el token y el estado de la cuenta (SCRUM-267). Un token mal firmado, vencido o de un
 * usuario inexistente es "invalid"; una cuenta que ya inició sesión alguna vez es "used".
 */
async function resolveInvite(token: string): Promise<InviteState> {
  const verified = verifyInviteToken(token);
  if (!verified) return { status: "invalid" };

  const { data, error } = await createAdminClient().auth.admin.getUserById(verified.userId);
  const user = data?.user;
  if (error || !user?.email) return { status: "invalid" };
  if (user.last_sign_in_at) return { status: "used" };

  return { status: "ok", email: user.email };
}

async function claimInvite(formData: FormData) {
  "use server";
  const token = formData.get("token");
  if (typeof token !== "string" || !token) redirect("/login");

  // El email sale de la base de datos, nunca del formulario.
  const invite = await resolveInvite(token);
  if (invite.status !== "ok") redirect(`/invite/${encodeURIComponent(token)}`);

  const siteUrl = await getSiteUrl();
  const { data, error } = await createAdminClient().auth.admin.generateLink({
    type: "recovery",
    email: invite.email,
    options: { redirectTo: `${siteUrl}/update-password` },
  });

  if (error || !data?.properties?.action_link) {
    redirect(`/update-password#error=access_denied&error_description=No+se+pudo+generar+el+link`);
  }

  redirect(data.properties.action_link);
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <AuthShell>
      <div className="text-center">{children}</div>
    </AuthShell>
  );
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token: rawToken } = await params;
  // Un link malformado (ej: /invite/%%%) no debe terminar en un 400 del framework (SCRUM-330).
  let token = rawToken;
  try {
    token = decodeURIComponent(rawToken);
  } catch {
    token = "";
  }
  const invite = await resolveInvite(token);

  if (invite.status !== "ok") {
    const used = invite.status === "used";
    return (
      <Shell>
        <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7 text-amber-600" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          {used ? "Esta invitación ya fue usada" : "Link inválido o vencido"}
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          {used
            ? "Tu cuenta ya está activa. Si olvidaste tu contraseña, podés recuperarla desde la pantalla de ingreso."
            : "Pedile a la dirección del instituto que te reenvíe la invitación."}
        </p>
        <Link
          href="/login"
          className="w-full inline-flex items-center justify-center bg-brand-700 hover:bg-brand-800 text-white font-semibold py-3 px-6 rounded-xl transition-colors text-sm"
        >
          Ir a iniciar sesión
        </Link>
      </Shell>
    );
  }

  // Detect if there's already an active session — warn the admin to use incognito
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user && user.email !== invite.email;

  return (
    <Shell>
      {isLoggedIn ? (
        <>
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Sesión activa detectada</h2>
          <p className="text-sm text-slate-500 mb-4">
            Estás logueado/a como <strong className="text-slate-700">{user.email}</strong>.<br />
            Si continuás desde esta pestaña, esa sesión se va a cerrar.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-left">
            <p className="text-xs font-semibold text-amber-800 mb-1">Para evitar perder tu sesión:</p>
            <p className="text-xs text-amber-700">
              Abrí este link en una <strong>ventana privada / incógnito</strong> y establecé la contraseña desde ahí.
            </p>
          </div>
          <form action={claimInvite}>
            <input type="hidden" name="token" value={token} />
            <button
              type="submit"
              className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-3 px-6 rounded-xl transition-colors text-sm mb-2"
            >
              Continuar de todas formas (cerrar mi sesión actual)
            </button>
          </form>
        </>
      ) : (
        <>
          <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-brand-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">¡Bienvenido/a a Smart Learning!</h2>
          <p className="text-sm text-slate-500 mb-6">
            Tu cuenta fue creada para <strong className="text-slate-700">{invite.email}</strong>.<br />
            Hacé clic para establecer tu contraseña y acceder a la plataforma.
          </p>
          <form action={claimInvite}>
            <input type="hidden" name="token" value={token} />
            <button
              type="submit"
              className="w-full bg-brand-700 hover:bg-brand-800 text-white font-semibold py-3 px-6 rounded-xl transition-colors text-sm inline-flex items-center justify-center gap-1"
            >
              Establecer mi contraseña <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
          <p className="text-xs text-slate-400 mt-4">
            Si no esperabas este acceso, ignorá esta página.
          </p>
        </>
      )}
    </Shell>
  );
}
