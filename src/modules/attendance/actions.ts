"use server";

import { revalidatePath } from "next/cache";
import { requireRole, getServerProfile } from "@/lib/auth/helpers";
import { assertCourseAccess } from "@/lib/auth/course-access";
import { portalPath } from "@/lib/portal";
import { isFutureDate } from "@/lib/validation";
import { recordBulkAttendance, isAttendanceRecorded, checkConsecutiveAbsences, getAbsenceAlertInfo, checkLowAttendanceThreshold, updateAttendanceSession, deleteAttendanceSession, allEnrollmentsInCourse } from "./services/attendance.service";
import { sendToRole } from "@/modules/notifications/services/notifications.service";
import { sendAlert } from "@/lib/notifications/send-alert";
import { sendAbsenceAlertEmail, sendTeacherAttendanceAlertEmail } from "@/lib/email";
import { checkAndTriggerDiagnosticAssessment } from "@/modules/assessments/services/auto-assessment.service";
import type { ActionResult } from "@/lib/action-result";
import { formatDateAR } from "@/lib/format";

const STATUSES = ["present", "absent", "late"] as const;
type AttendanceStatus = (typeof STATUSES)[number];

function readStatus(formData: FormData, enrollmentId: string): AttendanceStatus | null {
  const value = (formData.get(`status_${enrollmentId}`) as string | null) ?? "present";
  return (STATUSES as readonly string[]).includes(value) ? (value as AttendanceStatus) : null;
}

/** Sólo se acepta un redirectTo del portal del rol; si no, el listado de asistencia propio. */
function safeRedirect(requested: string | null, role: Parameters<typeof portalPath>[0]): string {
  return requested && requested.startsWith(portalPath(role, "/")) ? requested : portalPath(role, "/attendance");
}

export async function recordAttendanceAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const role = await requireRole(["director", "administrativo", "profesor"]);

  const courseId = formData.get("courseId") as string;
  const classDate = formData.get("classDate") as string;
  const enrollmentIds = ((formData.get("enrollmentIds") as string) ?? "").split(",").filter(Boolean);

  if (!courseId || !classDate || enrollmentIds.length === 0) {
    return { error: "Datos incompletos" };
  }
  await assertCourseAccess(role, courseId);
  if (isFutureDate(classDate)) return { error: "La fecha de la clase no puede ser futura" };
  if (!(await allEnrollmentsInCourse(courseId, enrollmentIds))) return { error: "Hay inscripciones que no pertenecen al curso" };
  if (enrollmentIds.some((id) => readStatus(formData, id) === null)) return { error: "Estado de asistencia inválido" };

  const alreadyRecorded = await isAttendanceRecorded(courseId, classDate);
  if (alreadyRecorded) return { error: "La asistencia de esta fecha ya fue registrada" };

  const records = enrollmentIds.map((enrollmentId) => ({
    enrollmentId,
    classDate,
    status: readStatus(formData, enrollmentId) as AttendanceStatus,
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
            body: `Registramos tu ausencia en ${info.courseName} el ${formatDateAR(classDate)}. Asistencia acumulada: ${info.attendancePct}%.`,
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
  return { success: "Asistencia registrada correctamente", redirectTo: safeRedirect(formData.get("redirectTo") as string | null, role) };
}

/**
 * Corrige una toma de lista ya registrada.
 *
 * Decisión de diseño: la corrección NO vuelve a disparar las alertas de ausencia
 * (email al alumno, aviso al docente, alerta de 2 faltas seguidas). Esas alertas
 * se emiten cuando la ausencia se registra por primera vez; reenviarlas al corregir
 * un error de carga notificaría al alumno de una falta que justamente se está dando
 * de baja. El % de asistencia sí queda recalculado, porque se lee de la BD.
 */
export async function updateAttendanceAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const role = await requireRole(["director", "administrativo", "profesor"]);

  const profile = await getServerProfile();
  if (!profile) return { error: "No autorizado" };

  const courseId = formData.get("courseId") as string;
  const classDate = formData.get("classDate") as string;
  const enrollmentIds = ((formData.get("enrollmentIds") as string) ?? "").split(",").filter(Boolean);

  if (!courseId || !classDate || enrollmentIds.length === 0) {
    return { error: "Datos incompletos" };
  }
  await assertCourseAccess(role, courseId);
  if (isFutureDate(classDate)) return { error: "La fecha de la clase no puede ser futura" };
  if (!(await allEnrollmentsInCourse(courseId, enrollmentIds))) return { error: "Hay inscripciones que no pertenecen al curso" };
  if (enrollmentIds.some((id) => readStatus(formData, id) === null)) return { error: "Estado de asistencia inválido" };

  const records = enrollmentIds.map((enrollmentId) => ({
    enrollmentId,
    status: readStatus(formData, enrollmentId) as AttendanceStatus,
    notes: (formData.get(`notes_${enrollmentId}`) as string) || null,
  }));

  const updated = await updateAttendanceSession(courseId, classDate, records, profile.id);
  if (updated === 0) {
    return { error: "No se encontraron registros de asistencia para esa fecha" };
  }

  revalidatePath("/director/attendance");
  revalidatePath("/profesor/attendance");
  revalidatePath("/administrativo/attendance");
  revalidatePath("/alumno/attendance");
  return { success: `Asistencia corregida (${updated} registros)`, redirectTo: safeRedirect(formData.get("redirectTo") as string | null, role) };
}

/** Elimina una toma de lista completa — clase no dictada o cargada sobre el curso equivocado. */
export async function deleteAttendanceSessionAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const role = await requireRole(["director", "administrativo", "profesor"]);

  const courseId = formData.get("courseId") as string;
  const classDate = formData.get("classDate") as string;

  if (!courseId || !classDate) return { error: "Datos incompletos" };
  await assertCourseAccess(role, courseId);

  const deleted = await deleteAttendanceSession(courseId, classDate);
  if (deleted === 0) {
    return { error: "No se encontraron registros de asistencia para esa fecha" };
  }

  revalidatePath("/director/attendance");
  revalidatePath("/profesor/attendance");
  revalidatePath("/administrativo/attendance");
  revalidatePath("/alumno/attendance");
  return { success: `Asistencia eliminada (${deleted} registros)`, redirectTo: safeRedirect(formData.get("redirectTo") as string | null, role) };
}
