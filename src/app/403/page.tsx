import Link from "next/link";
import { ShieldX } from "lucide-react";

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
          <ShieldX className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Acceso denegado</h1>
        <p className="text-sm text-slate-500 mb-6">
          No tenés permisos para acceder a esta sección. Si creés que es un error, contactá al administrador.
        </p>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" }}
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
