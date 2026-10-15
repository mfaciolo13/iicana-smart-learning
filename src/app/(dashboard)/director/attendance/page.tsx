import { AttendanceListPage } from "@/modules/attendance/components/AttendanceListPage";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return <AttendanceListPage sp={await searchParams} basePath="/director/attendance" />;
}
