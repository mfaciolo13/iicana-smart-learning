export type CourseStatus = "active" | "inactive" | "completed";
export type Level =
  | "beginner"
  | "elementary"
  | "pre_intermediate"
  | "intermediate"
  | "upper_intermediate"
  | "advanced";

export interface CourseWithTeacher {
  id: string;
  name: string;
  level: Level;
  schedule: string;
  classroom: string | null;
  maxCapacity: number;
  status: CourseStatus;
  teacherId: string | null;
  createdAt: Date;
  updatedAt: Date;
  teacher: {
    fullName: string;
    email: string;
  } | null;
  enrollmentCount: number;
}

export interface CourseListItem {
  id: string;
  name: string;
  level: Level;
  schedule: string;
  status: CourseStatus;
  maxCapacity: number;
  teacherName: string | null;
  enrollmentCount: number;
}
