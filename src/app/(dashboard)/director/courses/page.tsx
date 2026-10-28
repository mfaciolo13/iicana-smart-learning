import { CoursesListPage } from "@/modules/courses/components/CoursesListPage";

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return <CoursesListPage sp={await searchParams} basePath="/director/courses" canManage />;
}
