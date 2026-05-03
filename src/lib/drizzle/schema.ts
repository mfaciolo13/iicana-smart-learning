import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  integer,
  numeric,
  boolean,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum("role", [
  "admin",
  "profesor",
  "alumno",
  "tutor",
]);

export const studentStatusEnum = pgEnum("student_status", [
  "active",
  "inactive",
  "suspended",
  "graduated",
]);

export const courseStatusEnum = pgEnum("course_status", [
  "active",
  "inactive",
  "completed",
]);

export const enrollmentStatusEnum = pgEnum("enrollment_status", [
  "active",
  "completed",
  "withdrawn",
]);

export const attendanceStatusEnum = pgEnum("attendance_status", [
  "present",
  "absent",
  "late",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "paid",
  "overdue",
  "suspended",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "transfer",
  "card",
]);

export const marketingChannelEnum = pgEnum("marketing_channel", [
  "social_media",
  "email",
  "flyers",
  "word_of_mouth",
  "website",
  "other",
]);

export const inquiryStatusEnum = pgEnum("inquiry_status", [
  "pending",
  "enrolled",
  "lost",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "absence",
  "payment",
  "grade",
  "general",
  "alert",
]);

export const complaintTypeEnum = pgEnum("complaint_type", [
  "academic",
  "administrative",
  "infrastructure",
  "teacher",
]);

export const complaintStatusEnum = pgEnum("complaint_status", [
  "open",
  "in_progress",
  "resolved",
  "closed",
]);

export const levelEnum = pgEnum("level", [
  "beginner",
  "elementary",
  "pre_intermediate",
  "intermediate",
  "upper_intermediate",
  "advanced",
]);

export const evaluationTypeEnum = pgEnum("evaluation_type", [
  "parcial",
  "final",
  "oral",
  "homework",
  "quiz",
]);

export const assessmentStatusEnum = pgEnum("assessment_status", [
  "draft",
  "published",
  "archived",
]);

// ─── Tables ───────────────────────────────────────────────────────────────────

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // mirrors auth.users.id
  email: text("email").notNull().unique(),
  role: roleEnum("role").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const tutors = pgTable("tutors", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  dni: text("dni").notNull().unique(),
  relationship: text("relationship").notNull(), // madre, padre, tutor legal, etc.
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const students = pgTable("students", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  dni: text("dni").notNull().unique(),
  birthDate: date("birth_date").notNull(),
  tutorId: uuid("tutor_id").references(() => tutors.id, {
    onDelete: "set null",
  }),
  level: levelEnum("level"),
  placementTestScore: integer("placement_test_score"),
  status: studentStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const teachers = pgTable("teachers", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  dni: text("dni").notNull().unique(),
  specialization: text("specialization"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  level: levelEnum("level").notNull(),
  schedule: text("schedule").notNull(), // e.g. "Lun/Mié 18:00-19:30"
  classroom: text("classroom"),
  maxCapacity: integer("max_capacity").notNull().default(15),
  teacherId: uuid("teacher_id").references(() => teachers.id, {
    onDelete: "set null",
  }),
  status: courseStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const enrollments = pgTable("enrollments", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  enrolledAt: timestamp("enrolled_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  status: enrollmentStatusEnum("status").notNull().default("active"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const attendance = pgTable("attendance", {
  id: uuid("id").primaryKey().defaultRandom(),
  enrollmentId: uuid("enrollment_id")
    .notNull()
    .references(() => enrollments.id, { onDelete: "cascade" }),
  classDate: date("class_date").notNull(),
  status: attendanceStatusEnum("status").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const grades = pgTable("grades", {
  id: uuid("id").primaryKey().defaultRandom(),
  enrollmentId: uuid("enrollment_id")
    .notNull()
    .references(() => enrollments.id, { onDelete: "cascade" }),
  evaluationType: evaluationTypeEnum("evaluation_type").notNull(),
  score: numeric("score", { precision: 4, scale: 2 }).notNull(), // 1.00 – 10.00
  evaluatedAt: timestamp("evaluated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  notes: text("notes"),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  dueDate: date("due_date").notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  method: paymentMethodEnum("method"),
  status: paymentStatusEnum("status").notNull().default("pending"),
  receiptNumber: text("receipt_number").unique(),
  notes: text("notes"),
  overdueAlertSentAt: timestamp("overdue_alert_sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const complaints = pgTable("complaints", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  type: complaintTypeEnum("type").notNull(),
  description: text("description").notNull(),
  status: complaintStatusEnum("status").notNull().default("open"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const assessments = pgTable("assessments", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  weekLabel: text("week_label").notNull(), // e.g. "Semana 3 — Mayo 2025"
  topic: text("topic").notNull(),
  status: assessmentStatusEnum("status").notNull().default("draft"),
  questions: jsonb("questions").notNull().default([]),
  // questions shape: { question, options: string[], correct: number, explanation }[]
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const assessmentAttempts = pgTable("assessment_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  assessmentId: uuid("assessment_id")
    .notNull()
    .references(() => assessments.id, { onDelete: "cascade" }),
  studentId: uuid("student_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  answers: jsonb("answers").notNull().default([]),
  // answers shape: number[] — index of chosen option per question
  score: integer("score").notNull().default(0), // 0–100
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const marketingCampaigns = pgTable("marketing_campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  channel: marketingChannelEnum("channel").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  budget: numeric("budget", { precision: 10, scale: 2 }),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const inquiries = pgTable("inquiries", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  campaignId: uuid("campaign_id").references(() => marketingCampaigns.id, {
    onDelete: "set null",
  }),
  status: inquiryStatusEnum("status").notNull().default("pending"),
  notes: text("notes"),
  receivedAt: date("received_at").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const teacherSurveys = pgTable("teacher_surveys", {
  id: uuid("id").primaryKey().defaultRandom(),
  teacherId: uuid("teacher_id")
    .notNull()
    .references(() => teachers.id, { onDelete: "cascade" }),
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  enrollmentId: uuid("enrollment_id").references(() => enrollments.id, {
    onDelete: "set null",
  }),
  rating1: integer("rating1").notNull(), // Claridad al explicar
  rating2: integer("rating2").notNull(), // Disponibilidad para consultas
  rating3: integer("rating3").notNull(), // Ritmo de la clase
  rating4: integer("rating4").notNull(), // Recomendaría este docente
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const classObservations = pgTable("class_observations", {
  id: uuid("id").primaryKey().defaultRandom(),
  teacherId: uuid("teacher_id")
    .notNull()
    .references(() => teachers.id, { onDelete: "cascade" }),
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  observedBy: uuid("observed_by")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  observedAt: date("observed_at").notNull(),
  overallRating: integer("overall_rating").notNull(), // 1–5
  observations: text("observations").notNull(),
  strengths: text("strengths"),
  improvements: text("improvements"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;

export type Tutor = typeof tutors.$inferSelect;
export type NewTutor = typeof tutors.$inferInsert;

export type Teacher = typeof teachers.$inferSelect;
export type NewTeacher = typeof teachers.$inferInsert;

export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;

export type Enrollment = typeof enrollments.$inferSelect;
export type NewEnrollment = typeof enrollments.$inferInsert;

export type Attendance = typeof attendance.$inferSelect;
export type NewAttendance = typeof attendance.$inferInsert;

export type Grade = typeof grades.$inferSelect;
export type NewGrade = typeof grades.$inferInsert;

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

export type Complaint = typeof complaints.$inferSelect;
export type NewComplaint = typeof complaints.$inferInsert;

export type Assessment = typeof assessments.$inferSelect;
export type NewAssessment = typeof assessments.$inferInsert;

export type AssessmentAttempt = typeof assessmentAttempts.$inferSelect;
export type NewAssessmentAttempt = typeof assessmentAttempts.$inferInsert;
