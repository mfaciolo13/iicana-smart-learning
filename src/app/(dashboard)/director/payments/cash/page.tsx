import { requireRole } from "@/lib/auth/helpers";
import { CashPanel } from "@/modules/payments/components/CashPanel";

export default async function CashPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireRole(["director"]);
  return <CashPanel portal="director" sp={await searchParams} />;
}
