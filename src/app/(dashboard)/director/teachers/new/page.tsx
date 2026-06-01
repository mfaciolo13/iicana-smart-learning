import { createTeacherAction } from "@/modules/teachers/actions";
import { TeacherForm } from "@/modules/teachers/components/TeacherForm";

export default function NewTeacherPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Nuevo docente</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Completá los datos para registrar un nuevo docente
        </p>
      </div>
      <TeacherForm action={createTeacherAction} submitLabel="Registrar docente" />
    </div>
  );
}
