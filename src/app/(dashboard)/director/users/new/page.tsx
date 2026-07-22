import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdministrativoForm } from "@/modules/users/components/AdministrativoForm";

export default function NewAdministrativoPage() {
  return (
    <div>
      <div className="mb-6">
        <Link
          href="/director/users"
          className="text-sm text-slate-400 hover:text-slate-600 inline-flex items-center gap-1 mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Usuarios
        </Link>
        <h2 className="text-2xl font-bold text-slate-900">Nuevo administrativo</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Completá los datos para registrar un nuevo usuario administrativo
        </p>
      </div>

      <AdministrativoForm />
    </div>
  );
}
