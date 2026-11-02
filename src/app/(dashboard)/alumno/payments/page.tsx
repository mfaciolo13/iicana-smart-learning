import { requireRole } from "@/lib/auth/helpers";
import { StudentPayments } from "@/modules/payments/components/StudentPayments";

export default async function AlumnoPaymentsPage({ searchParams }: { searchParams: Promise<{ mp?: string }> }) {
  await requireRole(["alumno"]);
  const { mp } = await searchParams;
  return <StudentPayments mp={mp && ["success", "failure", "pending"].includes(mp) ? mp : undefined} />;
}
