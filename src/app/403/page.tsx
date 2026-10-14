import Link from "next/link";
import { ShieldX } from "lucide-react";
import { getServerProfile } from "@/lib/auth/helpers";

// SCRUM-330: mismo branding que la 404; sin sesión se invita a iniciar sesión (antes decía "No tenés
// permisos") y con sesión el botón vuelve al portal del propio rol, no siempre a /director.
export default async function ForbiddenPage() {
  const profile = await getServerProfile();
  const home = profile ? `/${profile.role}` : "/login";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center gap-2.5 mb-10">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" }}
          >
            <svg width="19" height="19" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polygon points="10,2 18,6.5 10,11 2,6.5" fill="white" />
              <path d="M4 8v3.5C4 14.5 7 16 10 16s6-1.5 6-4.5V8Z" fill="white" fillOpacity="0.3" />
            </svg>
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">Smart Learning</span>
        </div>

        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
          <ShieldX className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">{profile ? "Acceso denegado" : "Iniciá sesión"}</h1>
        <p className="text-sm text-slate-500 mb-6">
          {profile
            ? "No tenés permisos para acceder a esta sección. Si creés que es un error, contactá a la dirección del instituto."
            : "Necesitás iniciar sesión para ver esta sección."}
        </p>
        <Link
          href={home}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" }}
        >
          {profile ? "Volver al inicio" : "Ir a iniciar sesión"}
        </Link>
      </div>
    </div>
  );
}
