import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/helpers";
import { getAssessmentsForTeacher } from "@/modules/assessments/services/assessments.service";
import { AssessmentsListPage } from "@/modules/assessments/components/AssessmentsListPage";

export default async function ProfesorAssessmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const items = await getAssessmentsForTeacher(user.id);

  return (
    <AssessmentsListPage
      sp={await searchParams}
      basePath="/profesor/assessments"
      items={items}
      subtitle="Quizzes semanales generados con inteligencia artificial para tus cursos"
    />
  );
}
