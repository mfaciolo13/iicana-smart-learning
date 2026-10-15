import { StudentsListPage } from "@/modules/students/components/StudentsListPage";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return <StudentsListPage sp={await searchParams} basePath="/administrativo/students" />;
}
