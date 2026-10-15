import { PaymentsListPage } from "@/modules/payments/components/PaymentsListPage";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return <PaymentsListPage sp={await searchParams} basePath="/director/payments" />;
}
