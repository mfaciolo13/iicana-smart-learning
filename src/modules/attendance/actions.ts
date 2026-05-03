"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/helpers";
import { recordBulkAttendance, isAttendanceRecorded } from "./services/attendance.service";
import type { ActionResult } from "@/lib/action-result";

export async function recordAttendanceAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["admin", "profesor"]);

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

  revalidatePath("/admin/attendance");
  redirect("/admin/attendance");
}
