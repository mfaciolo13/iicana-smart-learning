import { requireRole } from "@/lib/auth/helpers";
import { PaymentDetail } from "@/modules/payments/components/PaymentDetail";

export default async function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["director"]);
  const { id } = await params;
  return <PaymentDetail id={id} portal="director" />;
}
