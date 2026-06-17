"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/helpers";
import { recordBulkAttendance, isAttendanceRecorded, checkConsecutiveAbsences, getAbsenceAlertInfo, checkLowAttendanceThreshold } from "./services/attendance.service";
import { sendToRole } from "@/modules/notifications/services/notifications.service";
import { sendAlert } from "@/lib/notifications/send-alert";
import { sendAbsenceAlertEmail, sendTeacherAttendanceAlertEmail } from "@/lib/email";
import { checkAndTriggerDiagnosticAssessment } from "@/modules/assessments/services/auto-assessment.service";
import type { ActionResult } from "@/lib/action-result";

export async function recordAttendanceAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director", "administrativo", "profesor"]);

  const courseId = formData.get("courseId") as string;
  const classDate = formData.get("classDate") as string;
  const enrollmentIds = (formData.get("enrollmentIds") as string).split(",").filter(Boolean);

  if (!courseId || !classDate || enrollmentIds.length === 0) {
    return { error: "Datos incompletos" };
  }

  const alreadyRecorded = await isAttendanceRecorded(courseId, classDate);
  if (alreadyRecorded) return { error: "La asistencia de esta fecha ya fue registrada" };

  const records = enrollmentIds.map((enrollmentId) => ({
    enrollmentId,
    classDate,
    status: (formData.get(`status_${enrollmentId}`) as "present" | "absent" | "late") ?? "present",
    notes: (formData.get(`notes_${enrollmentId}`) as string) || null,
  }));

  await recordBulkAttendance(records);

  const absentIds = records.filter((r) => r.status === "absent").map((r) => r.enrollmentId);
  const alerts = await checkConsecutiveAbsences(absentIds);
  if (alerts.length > 0) {
    await Promise.all(
      alerts.flatMap((alert) => {
        const payload = {
          type: "absence" as const,
          title: "2 ausencias consecutivas",
          body: `${alert.studentName} acumuló 2 ausencias seguidas en ${alert.courseName}.`,
        };
        return [sendToRole("director", payload)];
      })
    );
  }

  if (absentIds.length > 0) {
    const absenceAlertInfo = await getAbsenceAlertInfo(absentIds);
    await Promise.all(
      absenceAlertInfo.map((info) =>
        sendAlert({
          userId: info.studentProfileId,
          alertType: "absence",
          notification: {
            type: "absence",
            title: "Ausencia registrada",
            body: `Registramos tu ausencia en ${info.courseName} el ${new Date(classDate).toLocaleDateString("es-AR")}. Asistencia acumulada: ${info.attendancePct}%.`,
          },
          sendEmail: () =>
            sendAbsenceAlertEmail({
              to: info.studentEmail,
              fullName: info.studentName,
              courseName: info.courseName,
              classDate,
              attendancePercentage: info.attendancePct,
            }),
        })
      )
    );
  }

  // Alert teacher when a student first drops below 70% attendance
  const lowAttendanceAlerts = await checkLowAttendanceThreshold(absentIds);
  for (const alert of lowAttendanceAlerts) {
    try {
      await sendTeacherAttendanceAlertEmail({
        to: alert.teacherEmail,
        teacherName: alert.teacherName,
        studentName: alert.studentName,
        courseName: alert.courseName,
        attendancePct: alert.attendancePct,
      });
    } catch (err) {
      console.error(`[attendance] failed sending low-attendance email to ${alert.teacherEmail}:`, err);
    }
    await sendToRole("director", {
      type: "alert" as const,
      title: "Asistencia crítica",
      body: `${alert.studentName} bajó a ${alert.attendancePct}% de asistencia en ${alert.courseName}.`,
    });
  }

  // Trigger auto-diagnostic assessment if course frequency is configured (non-blocking)
  try {
    await checkAndTriggerDiagnosticAssessment(courseId);
  } catch (err) {
    console.error("[attendance] auto-assessment trigger failed:", err);
  }

  revalidatePath("/director/attendance");
  revalidatePath("/profesor/attendance");
  revalidatePath("/administrativo/attendance");
  const redirectTo = (formData.get("redirectTo") as string) || "/director/attendance";
  return { success: "Asistencia registrada correctamente", redirectTo };
}
