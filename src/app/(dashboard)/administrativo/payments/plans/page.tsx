import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/helpers";
import { Card } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/SearchInput";
import { PlansTable } from "@/modules/payments/components/PricingSettings";
import { listFeePlans } from "@/modules/payments/services/fee-plans.service";
import { getPricingRates } from "@/modules/payments/services/settings.service";

/** Consulta de precios vigentes: el administrativo ve los precios pero no puede modificarlos. */
export default async function PlansPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireRole(["administrativo"]);
  const { q } = await searchParams;
  const [plans, rates] = await Promise.all([listFeePlans(q), getPricingRates()]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/administrativo/payments" className="text-sm text-slate-400 hover:text-slate-600 mb-1 inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Pagos
        </Link>
        <h2 className="text-2xl font-bold text-slate-900">Precios vigentes</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Descuento general: {rates.transferDiscountPct}% transferencia y {rates.cashDiscountPct}% efectivo hasta el día {rates.discountLastDay};
          tarjeta con {rates.cardSurchargePct}% de recargo sobre la lista. Solo Dirección puede modificarlos.
        </p>
      </div>
      <Card padding="md">
        <SearchInput placeholder="Buscar alumno por nombre o DNI..." resultCount={plans.length} className="mb-4" />
        <PlansTable plans={plans} courses={[]} editable={false} />
      </Card>
    </div>
  );
}
