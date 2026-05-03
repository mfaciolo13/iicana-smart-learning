export interface EnrollmentForSurvey {
  enrollmentId: string;
  courseId: string;
  courseName: string;
  courseLevel: string;
  teacherId: string | null;
  teacherName: string | null;
  surveyId: string | null;
}

export interface TeacherSurveyInput {
  teacherId: string;
  courseId: string;
  enrollmentId?: string;
  rating1: number;
  rating2: number;
  rating3: number;
  rating4: number;
  comment?: string;
}

export interface ClassObservationInput {
  teacherId: string;
  courseId: string;
  observedAt: string;
  overallRating: number;
  observations: string;
  strengths?: string;
  improvements?: string;
}

export interface TeacherEvalSummary {
  teacherId: string;
  teacherName: string;
  surveyCount: number;
  avgRating: number | null;
  observationCount: number;
  lastObservedAt: string | null;
}

export interface TeacherSurveyAggregate {
  avg1: number;
  avg2: number;
  avg3: number;
  avg4: number;
  total: number;
  recentComments: string[];
}

export interface ClassObservationDetail {
  id: string;
  observedAt: string;
  overallRating: number;
  observations: string;
  strengths: string | null;
  improvements: string | null;
  observerName: string;
  courseName: string;
}
