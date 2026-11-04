import { requireRole } from "@/lib/auth/helpers";
import { CashPanel } from "@/modules/payments/components/CashPanel";

export default async function CashPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireRole(["administrativo"]);
  return <CashPanel portal="administrativo" sp={await searchParams} />;
}
