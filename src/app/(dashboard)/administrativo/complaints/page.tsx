import { ComplaintsListPage } from "@/modules/complaints/components/ComplaintsListPage";

export default async function AdminComplaintsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return <ComplaintsListPage sp={await searchParams} basePath="/administrativo/complaints" />;
}
