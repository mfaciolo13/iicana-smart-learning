import { z } from "zod";

export const recordAttendanceSchema = z.object({
  courseId: z.uuid("Seleccioná un curso"),
  classDate: z.string().min(1, "La fecha es requerida"),
  // enrollmentIds passed as comma-separated list
  enrollmentIds: z.string().min(1),
});

export const attendanceStatusEnum = z.enum(["present", "absent", "late"]);

export type RecordAttendanceInput = z.infer<typeof recordAttendanceSchema>;
