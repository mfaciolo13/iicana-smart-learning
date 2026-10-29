import Link from "next/link";
import { ShieldX } from "lucide-react";
import { getServerProfile } from "@/lib/auth/helpers";
import { Logo } from "@/components/shared/Logo";
import { buttonVariants } from "@/components/ui/Button";

// SCRUM-330: mismo branding que la 404; sin sesión se invita a iniciar sesión (antes decía "No tenés
// permisos") y con sesión el botón vuelve al portal del propio rol, no siempre a /director.
export default async function ForbiddenPage() {
  const profile = await getServerProfile();
  const home = profile ? `/${profile.role}` : "/login";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md text-center">
        <Link href="/login" className="inline-flex mb-12">
          <Logo size={36} textClassName="text-xl" />
        </Link>

        <div className="w-14 h-14 rounded-full bg-red-50 ring-1 ring-red-200 flex items-center justify-center mx-auto mb-5">
          <ShieldX className="w-7 h-7 text-red-600" strokeWidth={1.75} />
        </div>
        <h1 className="text-3xl text-slate-900 mb-3">{profile ? "Acceso denegado" : "Iniciá sesión"}</h1>
        <p className="text-sm text-slate-500 mb-8 leading-relaxed">
          {profile
            ? "No tenés permisos para acceder a esta sección. Si creés que es un error, contactá a la dirección del instituto."
            : "Necesitás iniciar sesión para ver esta sección."}
        </p>
        <Link href={home} className={buttonVariants({ variant: "primary" })}>
          {profile ? "Volver al inicio" : "Ir a iniciar sesión"}
        </Link>
      </div>
    </div>
  );
}
