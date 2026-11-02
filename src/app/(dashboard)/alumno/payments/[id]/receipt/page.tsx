import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/helpers";
import { getCurrentStudentId } from "@/modules/payments/services/payments.service";
import { getReceiptData } from "@/modules/payments/services/documents.service";
import { ReceiptDocument } from "@/modules/payments/components/ReceiptDocument";

export default async function AlumnoReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["alumno"]);
  const { id } = await params;
  const studentId = await getCurrentStudentId();
  const data = await getReceiptData(id);
  // Un alumno solo puede abrir comprobantes propios: cualquier otro id responde 404, no 403.
  if (!studentId || !data || data.studentId !== studentId || data.status !== "paid") notFound();
  return <ReceiptDocument data={data} backHref="/alumno/payments" invoiceHref={`/alumno/payments/${id}/invoice`} />;
}
