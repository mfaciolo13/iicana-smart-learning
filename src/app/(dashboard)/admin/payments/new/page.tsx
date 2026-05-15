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

  const { data: rows } = await supabase
    .from("students")
    .select("id, dni, level, status, profiles(full_name, email)")
    .order("full_name", { referencedTable: "profiles" });

  type ProfileRaw = { full_name: string; email: string } | null;
  const students: StudentListItem[] = (rows ?? []).map((s) => {
    const profile = s.profiles as unknown as ProfileRaw;
    return {
      id: s.id,
      fullName: profile?.full_name ?? "",
      email: profile?.email ?? "",
      dni: s.dni,
      level: s.level as StudentListItem["level"],
      status: s.status as StudentListItem["status"],
    };
  });

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
