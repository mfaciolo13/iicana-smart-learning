import { ComplaintForm } from "@/modules/complaints/components/ComplaintForm";
import { createComplaintAction } from "@/modules/complaints/actions";

export default function NewAlumnoComplaintPage() {
  return (
    <div>
      <div className="mb-6">
        <a href="/alumno/complaints" className="text-sm text-slate-400 hover:text-slate-600 mb-1 block">
          ← Mis reclamos
        </a>
        <h2 className="text-2xl font-bold text-slate-900">Nuevo reclamo</h2>
        <p className="text-sm text-slate-400 mt-0.5">Describí tu problema y lo revisaremos en 48hs</p>
      </div>
      <ComplaintForm cancelHref="/alumno/complaints" action={createComplaintAction} />
    </div>
  );
}
