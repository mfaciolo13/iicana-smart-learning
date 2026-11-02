import { requireRole } from "@/lib/auth/helpers";
import { StudentPayments } from "@/modules/payments/components/StudentPayments";

export default async function AlumnoPaymentsPage() {
  await requireRole(["alumno"]);
  return <StudentPayments />;
}
