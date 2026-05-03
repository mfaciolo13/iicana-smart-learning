import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/drizzle";
import { courses, teachers, profiles } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";
import { getStudentByProfileId } from "@/modules/students/services/students.service";
import { hasSurveySubmitted } from "@/modules/teacher-evaluations/services/teacher-evaluations.service";
import { submitSurveyAction } from "@/modules/teacher-evaluations/actions";
import { SurveyForm } from "@/modules/teacher-evaluations/components/SurveyForm";

export default async function AlumnoSurveyPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ enrollment?: string }>;
}) {
  const { courseId } = await params;
  const { enrollment: enrollmentId } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const student = await getStudentByProfileId(user.id);
  if (!student) redirect("/alumno");

  if (enrollmentId && (await hasSurveySubmitted(enrollmentId))) {
    redirect("/alumno/evaluations");
  }

  const [course] = await db
    .select({
      id: courses.id,
      name: courses.name,
      teacherId: courses.teacherId,
      teacherName: profiles.fullName,
    })
    .from(courses)
    .leftJoin(teachers, eq(courses.teacherId, teachers.id))
    .leftJoin(profiles, eq(teachers.profileId, profiles.id))
    .where(eq(courses.id, courseId))
    .limit(1);

  if (!course || !course.teacherId) notFound();

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Evaluación docente</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          {course.name} · {course.teacherName}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-xl">
        <SurveyForm
          teacherId={course.teacherId}
          courseId={course.id}
          enrollmentId={enrollmentId ?? ""}
          action={submitSurveyAction}
        />
      </div>
    </div>
  );
}
