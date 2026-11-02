import { asc, eq, ilike, or } from "drizzle-orm";
import { db, dbTx } from "@/lib/drizzle";
import { courses, profiles, studentFeePlans, students } from "@/lib/drizzle/schema";
import { recordAudit, type Actor } from "@/lib/audit";

export interface FeePlanRow {
  studentId: string;
  studentName: string;
  studentDni: string;
  courseId: string | null;
  courseName: string | null;
  listPrice: string | null;
  transferPrice: string | null;
  cashPrice: string | null;
}

/** Alumnos activos con su plan de cuota (si ya se cargó). */
export async function listFeePlans(search?: string): Promise<FeePlanRow[]> {
  const term = search?.trim();
  return db
    .select({
      studentId: students.id,
      studentName: profiles.fullName,
      studentDni: students.dni,
      courseId: studentFeePlans.courseId,
      courseName: courses.name,
      listPrice: studentFeePlans.listPrice,
      transferPrice: studentFeePlans.transferPrice,
      cashPrice: studentFeePlans.cashPrice,
    })
    .from(students)
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .leftJoin(studentFeePlans, eq(studentFeePlans.studentId, students.id))
    .leftJoin(courses, eq(studentFeePlans.courseId, courses.id))
    .where(
      term
        ? or(ilike(profiles.fullName, `%${term.replace(/[%_]/g, "")}%`), ilike(students.dni, `%${term.replace(/[%_]/g, "")}%`))
        : eq(students.status, "active"),
    )
    .orderBy(asc(profiles.fullName));
}

export async function getFeePlan(studentId: string) {
  const [row] = await db.select().from(studentFeePlans).where(eq(studentFeePlans.studentId, studentId)).limit(1);
  return row ?? null;
}

/** Planes por alumno en un mapa, para precargar el alta de cuotas. */
export async function getFeePlansByStudent(): Promise<Record<string, { courseId: string | null; listPrice: string; transferPrice: string | null; cashPrice: string | null }>> {
  const rows = await db.select().from(studentFeePlans);
  return Object.fromEntries(
    rows.map((r) => [r.studentId, { courseId: r.courseId, listPrice: r.listPrice, transferPrice: r.transferPrice, cashPrice: r.cashPrice }]),
  );
}

export async function saveFeePlan(
  input: { studentId: string; courseId?: string | null; listPrice: number; transferPrice?: number | null; cashPrice?: number | null },
  actor: Actor,
) {
  await dbTx.transaction(async (tx) => {
    const [before] = await tx.select().from(studentFeePlans).where(eq(studentFeePlans.studentId, input.studentId)).limit(1);
    const values = {
      courseId: input.courseId ?? null,
      listPrice: String(input.listPrice),
      transferPrice: input.transferPrice != null ? String(input.transferPrice) : null,
      cashPrice: input.cashPrice != null ? String(input.cashPrice) : null,
      updatedBy: actor.id,
      updatedAt: new Date(),
    };
    await tx
      .insert(studentFeePlans)
      .values({ studentId: input.studentId, ...values })
      .onConflictDoUpdate({ target: studentFeePlans.studentId, set: values });
    await recordAudit(tx, actor, {
      action: "fee_plan.saved",
      entityType: "student_fee_plan",
      entityId: input.studentId,
      before: before ?? null,
      after: values,
    });
  });
}
