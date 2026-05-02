export type EvaluationType = "parcial" | "final" | "oral" | "homework" | "quiz";

export interface GradeWithDetails {
  id: string;
  enrollmentId: string;
  evaluationType: EvaluationType;
  score: string;
  evaluatedAt: Date;
  notes: string | null;
  studentName: string;
  studentDni: string;
  courseName: string;
  courseLevel: string;
}

export interface StudentAverage {
  studentId: string;
  studentName: string;
  courseName: string;
  average: number;
  gradeCount: number;
}
