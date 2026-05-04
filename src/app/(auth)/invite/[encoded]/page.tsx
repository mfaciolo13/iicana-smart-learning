import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function claimInvite(formData: FormData) {
  "use server";
  const email = formData.get("email") as string;
  if (!email) redirect("/login");

  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const siteUrl = `${proto}://${host}`;

  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${siteUrl}/update-password` },
  });

  if (error || !data?.properties?.action_link) {
    redirect(`/update-password#error=access_denied&error_description=No+se+pudo+generar+el+link`);
  }

  redirect(data.properties.action_link);
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ encoded: string }>;
}) {
  const { encoded } = await params;
  let email = "";
  try {
    email = Buffer.from(encoded, "base64url").toString("utf-8");
  } catch {
    redirect("/login");
  }

  // Detect if there's already an active session — warn the admin to use incognito
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user && user.email !== email;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-120">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" }}
            >
              <svg width="19" height="19" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polygon points="10,2 18,6.5 10,11 2,6.5" fill="white"/>
                <path d="M4 8v3.5C4 14.5 7 16 10 16s6-1.5 6-4.5V8Z" fill="white" fillOpacity="0.3"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Smart Learning</h1>
          </div>
          <p className="text-sm text-slate-500">Sistema de Gestión Académica</p>
        </div>

        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-8 text-center">

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
                <input type="hidden" name="email" value={email} />
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
                Tu cuenta fue creada para <strong className="text-slate-700">{email}</strong>.<br />
                Hacé clic para establecer tu contraseña y acceder a la plataforma.
              </p>
              <form action={claimInvite}>
                <input type="hidden" name="email" value={email} />
                <button
                  type="submit"
                  className="w-full bg-brand-700 hover:bg-brand-800 text-white font-semibold py-3 px-6 rounded-xl transition-colors text-sm"
                >
                  Establecer mi contraseña →
                </button>
              </form>
              <p className="text-xs text-slate-400 mt-4">
                Si no esperabas este acceso, ignorá esta página.
              </p>
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          © Smart Learning {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
