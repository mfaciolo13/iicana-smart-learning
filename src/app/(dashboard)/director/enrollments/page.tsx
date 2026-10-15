import { EnrollmentsListPage } from "@/modules/enrollments/components/EnrollmentsListPage";

export default async function EnrollmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return <EnrollmentsListPage sp={await searchParams} basePath="/director/enrollments" />;
}
