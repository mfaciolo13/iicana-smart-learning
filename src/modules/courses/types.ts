export type CourseStatus = "active" | "inactive" | "completed";
export type Level =
  | "beginner"
  | "elementary"
  | "pre_intermediate"
  | "intermediate"
  | "upper_intermediate"
  | "advanced";

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface CourseWithTeacher {
  id: string;
  name: string;
  level: Level;
  schedule: string;
  classDays: DayOfWeek[];
  classTime: string;
  classDurationMinutes: number;
  classroom: string | null;
  maxCapacity: number;
  diagnosticFrequency: number;
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
