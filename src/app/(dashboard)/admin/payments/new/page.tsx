import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PaymentForm } from "@/modules/payments/components/PaymentForm";
import { createPaymentAction } from "@/modules/payments/actions";
import type { StudentListItem } from "@/modules/students/types";

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const { studentId } = await searchParams;
  const supabase = await createClient();

  const { data: studentRows } = await supabase
    .from("students")
    .select("id, dni, level, status, profile_id");

  const profileIds = (studentRows ?? []).map((s) => s.profile_id);
  const { data: profileRows } = profileIds.length > 0
    ? await supabase.from("profiles").select("id, full_name, email").in("id", profileIds)
    : { data: [] as { id: string; full_name: string; email: string }[] };

  const profileMap = new Map((profileRows ?? []).map((p) => [p.id, p]));

  const students: StudentListItem[] = (studentRows ?? [])
    .map((s) => {
      const profile = profileMap.get(s.profile_id);
      return {
        id: s.id,
        fullName: profile?.full_name ?? "",
        email: profile?.email ?? "",
        dni: s.dni,
        level: s.level as StudentListItem["level"],
        status: s.status as StudentListItem["status"],
      };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  return (
    <div>
      <div className="mb-6">
        <a href="/admin/payments" className="text-sm text-slate-400 hover:text-slate-600 mb-1 inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Pagos
        </a>
        <h2 className="text-2xl font-bold text-slate-900">Registrar pago</h2>
        <p className="text-sm text-slate-400 mt-0.5">Creá un nuevo pago para un alumno</p>
      </div>

      <PaymentForm
        students={students}
        defaultStudentId={studentId}
        action={createPaymentAction}
      />
    </div>
  );
}
