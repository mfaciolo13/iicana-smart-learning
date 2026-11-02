import { requireRole } from "@/lib/auth/helpers";
import { InvoicingForm, PlansTable, RatesForm } from "@/modules/payments/components/PricingSettings";
import { Card } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/SearchInput";
import { getInvoicingSettings, getPricingRates } from "@/modules/payments/services/settings.service";
import { getArcaConfig } from "@/lib/arca";
import { listFeePlans } from "@/modules/payments/services/fee-plans.service";
import { getCourseOptions } from "@/modules/payments/services/payments.service";

export default async function PaymentSettingsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireRole(["director"]);
  const { q } = await searchParams;
  const [rates, plans, courses, invoicing] = await Promise.all([getPricingRates(), listFeePlans(q), getCourseOptions(), getInvoicingSettings()]);
  const arca = getArcaConfig();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Precios y recargos</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Política económica de las cuotas y precios acordados por alumno. Cada cambio queda en la auditoría.
        </p>
      </div>
      <RatesForm rates={rates} />
      <InvoicingForm autoInvoiceCash={invoicing.autoInvoiceCash} arcaConfigured={Boolean(arca)} env={arca?.env ?? "homologacion"} />
      <Card
        title="Precios por alumno"
        description="Precargan las cuotas nuevas del alumno. Si dejás transferencia o efectivo vacíos, se aplica el descuento general."
        padding="md"
      >
        <SearchInput placeholder="Buscar alumno por nombre o DNI..." resultCount={plans.length} className="mb-4" />
        <PlansTable plans={plans} courses={courses} editable />
      </Card>
    </div>
  );
}
