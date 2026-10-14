export type AssessmentStatus = "draft" | "published" | "archived";

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

/** Pregunta tal como la recibe el alumno: sin la respuesta correcta ni la explicación (SCRUM-301). */
export interface PublicQuizQuestion {
  question: string;
  options: string[];
}

/** Resultado de corregir una respuesta en el servidor. */
export interface AnswerFeedback {
  correct: boolean;
  correctIndex: number;
  explanation: string;
}

export interface AssessmentListItem {
  id: string;
  courseId: string;
  courseName: string;
  weekLabel: string;
  topic: string;
  status: AssessmentStatus;
  questionCount: number;
  attemptCount: number;
  createdAt: Date;
}

export interface AssessmentDetail {
  id: string;
  courseId: string;
  courseName: string;
  createdBy: string;
  weekLabel: string;
  topic: string;
  status: AssessmentStatus;
  questions: QuizQuestion[];
  attemptCount: number;
  avgScore: number | null;
  createdAt: Date;
}

export interface StudentAssessmentItem {
  id: string;
  courseId: string;
  courseName: string;
  weekLabel: string;
  topic: string;
  questionCount: number;
  attempt: {
    id: string;
    score: number;
    completedAt: Date;
  } | null;
}

export interface AttemptResult {
  id: string;
  assessmentId: string;
  weekLabel: string;
  topic: string;
  courseName: string;
  questions: QuizQuestion[];
  answers: number[];
  score: number;
  completedAt: Date;
}
