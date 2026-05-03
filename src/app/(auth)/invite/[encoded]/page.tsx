import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

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

  const firstName = email.split("@")[0];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-120">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-700 tracking-tight">IICANA</h1>
          <p className="text-sm text-slate-500 mt-1">Sistema de Gestión Académica</p>
        </div>

        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-brand-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>

          <h2 className="text-xl font-semibold text-slate-900 mb-2">¡Bienvenido/a a IICANA!</h2>
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
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          © IICANA Pueyrredón {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
