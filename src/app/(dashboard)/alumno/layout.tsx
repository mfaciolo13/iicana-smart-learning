import { redirect } from "next/navigation";
import { getServerProfile } from "@/lib/auth/helpers";
import { isStudentAccessRestricted } from "@/modules/students/services/students.service";
import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

export default async function AlumnoLayout({ children }: { children: ReactNode }) {
  const profile = await getServerProfile(); // cache hit — already fetched by dashboard layout

  if (!profile) redirect("/login");
  if (profile.role !== "alumno") redirect(`/${profile.role}`);

  const restricted = await isStudentAccessRestricted(profile.id);

  if (restricted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-5">
          <AlertTriangle className="w-7 h-7 text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Acceso restringido</h2>
        <p className="text-sm text-slate-500 max-w-sm mb-1">
          Tu cuenta tiene <strong>2 o más cuotas vencidas</strong>. El acceso al sistema está suspendido hasta que regularices tu situación.
        </p>
        <p className="text-sm text-slate-400">
          Comunicate con el equipo administrativo para regularizar tu pago.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
