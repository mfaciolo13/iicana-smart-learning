import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/helpers";
import { AttendanceListPage } from "@/modules/attendance/components/AttendanceListPage";
import { getTeacherCourseIds } from "@/modules/attendance/services/attendance-sessions.service";

export default async function ProfesorAttendancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");

  // Sólo las clases de los cursos que dicta el docente.
  const courseIds = await getTeacherCourseIds(user.id);
  return <AttendanceListPage sp={await searchParams} basePath="/profesor/attendance" courseIds={courseIds} />;
}
