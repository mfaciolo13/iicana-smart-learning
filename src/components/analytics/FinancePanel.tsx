import { ChartCard } from "@/components/charts/ChartCard";
import { BarsChart } from "@/components/charts/BarsChart";
import { COLORS, withColor } from "@/components/charts/palette";
import { getFinanceAnalytics } from "@/modules/analytics/services/director-analytics.service";
import { formatMoneyAR } from "@/lib/format";

const AGING_COLORS: Record<string, string> = {
  "Al día": COLORS.green,
  "1–15 días": COLORS.amber,
  "16–30 días": "#f97316",
  "Más de 30 días": COLORS.red,
};

/** Cobranza del instituto: facturado vs cobrado por mes y deuda por antigüedad. */
export async function FinancePanel({ paymentsHref }: { paymentsHref: string }) {
  const f = await getFinanceAnalytics();
  const hasMonthly = f.byMonth.some((p) => (p.facturado ?? 0) > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <ChartCard
        className="lg:col-span-2"
        title="Facturado vs. cobrado por mes"
        subtitle={
          f.collectionRate !== null
            ? `Por mes de vencimiento · tasa de cobro del período: ${f.collectionRate}%`
            : "Por mes de vencimiento"
        }
        href={paymentsHref}
        empty={!hasMonthly}
        emptyText="Todavía no hay cuotas en los últimos 6 meses"
        summary={`Tasa de cobro del período: ${f.collectionRate ?? 0}%`}
      >
        <BarsChart
          data={f.byMonth}
          xKey="mes"
          format="money"
          series={[
            { key: "facturado", label: "Facturado", color: COLORS.brandSoft },
            { key: "cobrado", label: "Cobrado", color: COLORS.green },
          ]}
        />
      </ChartCard>

      <ChartCard
        title="Deuda por antigüedad"
        subtitle={`Total sin cobrar: ${formatMoneyAR(f.totalDebt)}`}
        href={paymentsHref}
        empty={f.totalDebt === 0}
        emptyText="No hay deuda pendiente"
      >
        <BarsChart
          data={withColor(f.aging, (a) => AGING_COLORS[a.bucket] ?? COLORS.slate)}
          xKey="bucket"
          layout="vertical"
          format="money"
          categoryWidth={104}
          showLabels
          series={[{ key: "amount", label: "Deuda" }]}
          colorKey="color"
        />
      </ChartCard>
    </div>
  );
}
