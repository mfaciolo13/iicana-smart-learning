export type EnrollmentStatus = "active" | "completed" | "withdrawn";

export interface EnrollmentWithDetails {
  id: string;
  studentId: string;
  courseId: string;
  enrolledAt: Date;
  status: EnrollmentStatus;
  student: {
    fullName: string;
    email: string;
    dni: string;
  };
  course: {
    name: string;
    level: string;
    schedule: string;
  };
}

export interface EnrollmentListItem {
  id: string;
  enrolledAt: Date;
  status: EnrollmentStatus;
  studentName: string;
  studentDni: string;
  courseName: string;
  courseLevel: string;
}
