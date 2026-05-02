export type AttendanceStatus = "present" | "absent" | "late";

export interface AttendanceRecord {
  id: string;
  enrollmentId: string;
  classDate: string;
  status: AttendanceStatus;
  notes: string | null;
  createdAt: Date;
  studentName: string;
  studentDni: string;
  courseName: string;
}

export interface AttendanceSession {
  classDate: string;
  courseName: string;
  courseId: string;
  total: number;
  present: number;
  absent: number;
  late: number;
}
