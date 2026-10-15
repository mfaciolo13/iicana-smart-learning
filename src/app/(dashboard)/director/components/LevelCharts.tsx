import { DashboardCharts } from "./DashboardCharts";
import {
  getPaymentStatusCounts,
  getAttendanceAvgByCourse,
  getGradeAvgByCourse,
  getActiveStudentsByLevel,
} from "@/modules/reports/services/dashboard.service";

/** Gráficos por curso y por nivel (con filtro por nivel). Carga aparte del resto del panel. */
export async function LevelCharts() {
  const paymentCounts = await getPaymentStatusCounts();
  const attendanceData = await getAttendanceAvgByCourse();
  const gradesData = await getGradeAvgByCourse();
  const levelData = await getActiveStudentsByLevel();

  return <DashboardCharts attendanceData={attendanceData} gradesData={gradesData} levelData={levelData} paymentCounts={paymentCounts} />;
}
