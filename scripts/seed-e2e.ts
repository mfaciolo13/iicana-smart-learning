/**
 * Seed determinístico para los tests E2E (Playwright).
 *
 * Crea un set reproducible de datos SOLO para el proyecto Supabase de TEST:
 *   - 4 usuarios de auth, uno por rol (director / administrativo / profesor / alumno)
 *   - datos de dominio (curso, inscripción, asistencia, notas, pagos, reclamo,
 *     notificación, autoevaluación, campaña + consulta, encuesta docente,
 *     observación de clase) para que TODAS las listas de la app tengan contenido.
 *
 * Es IDEMPOTENTE: primero borra todo lo que haya creado una corrida anterior
 * (identificado por el dominio de email @e2e.test y el prefijo "E2E" en los
 * nombres) y luego recrea desde cero. Se puede correr N veces sin ensuciar.
 *
 * ⚠️  NUNCA correr contra la base de producción. Usa exclusivamente .env.test.
 *
 *   pnpm seed:e2e
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { like, inArray } from "drizzle-orm";
import * as schema from "../src/lib/drizzle/schema";

// Cargar el entorno de TEST (no .env.local de producción)
config({ path: ".env.test" });

// ─── Guard-rails para no tocar producción por accidente ──────────────────────
const DATABASE_URL = process.env.DATABASE_URL;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!DATABASE_URL || !SUPABASE_URL || !SERVICE_KEY) {
  throw new Error(
    "Faltan variables en .env.test: DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SECRET_KEY.",
  );
}

// ─── Credenciales de los usuarios de prueba ──────────────────────────────────
// Estas mismas se usan en tests/e2e/helpers/users.ts y en .env.test
export const TEST_PASSWORD = "E2e-Test-2026!";
export const TEST_EMAIL_DOMAIN = "@e2e.test";

const TEST_USERS = [
  { key: "director", email: `director${TEST_EMAIL_DOMAIN}`, role: "director", fullName: "Director E2E" },
  { key: "administrativo", email: `administrativo${TEST_EMAIL_DOMAIN}`, role: "administrativo", fullName: "Administrativo E2E" },
  { key: "profesor", email: `profesor${TEST_EMAIL_DOMAIN}`, role: "profesor", fullName: "Profesor E2E" },
  { key: "alumno", email: `alumno${TEST_EMAIL_DOMAIN}`, role: "alumno", fullName: "Alumno E2E" },
] as const;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const client = postgres(DATABASE_URL, {
  ssl: { rejectUnauthorized: false },
  max: 1,
  prepare: false,
});
const db = drizzle(client, { schema });

// Helper de fecha local en formato YYYY-MM-DD
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ⚠️ El cliente Drizzle tiene max:1 conexión — NUNCA usar Promise.all con db.*
// (las queries concurrentes se cuelgan). Todo secuencial y await por await.

async function teardown() {
  console.log("🧹  Limpiando datos de una corrida anterior…");

  // El orden aprovecha los onDelete cascade / set null del schema.
  await db.delete(schema.courses).where(like(schema.courses.name, "E2E%"));
  await db.delete(schema.inquiries).where(like(schema.inquiries.name, "E2E%"));
  await db.delete(schema.marketingCampaigns).where(like(schema.marketingCampaigns.name, "E2E%"));
  // Los documentos subidos por usuarios E2E referencian profiles con una FK SIN
  // cascade (documents.uploaded_by_id), así que hay que borrarlos ANTES de los
  // profiles o el delete de profiles falla por violación de FK.
  await db.delete(schema.documents).where(
    inArray(
      schema.documents.uploadedById,
      db.select({ id: schema.profiles.id }).from(schema.profiles).where(like(schema.profiles.email, `%${TEST_EMAIL_DOMAIN}`)),
    ),
  );

  // Borrar los profiles de test cascadea students, teachers, notifications,
  // complaints, payments, etc.
  await db.delete(schema.profiles).where(like(schema.profiles.email, `%${TEST_EMAIL_DOMAIN}`));

  // Borrar los usuarios de auth correspondientes (paginado defensivo).
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const toDelete = data.users.filter((u) => u.email?.endsWith(TEST_EMAIL_DOMAIN));
    for (const u of toDelete) {
      await admin.auth.admin.deleteUser(u.id);
    }
    if (data.users.length < 200) break;
    page += 1;
  }
}

async function seed() {
  console.log("🌱  Creando usuarios de prueba…");

  const ids: Record<string, string> = {};
  for (const u of TEST_USERS) {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: u.fullName, role: u.role },
    });
    if (error || !data.user) throw error ?? new Error(`No se pudo crear ${u.email}`);
    ids[u.key] = data.user.id;

    await db.insert(schema.profiles).values({
      id: data.user.id,
      email: u.email,
      role: u.role,
      fullName: u.fullName,
      phone: "3516789012",
    });
  }

  console.log("🌱  Creando datos de dominio…");

  // Docente
  const [teacher] = await db
    .insert(schema.teachers)
    .values({ profileId: ids.profesor, dni: "30111222", specialization: "Inglés general" })
    .returning();

  // Alumno
  const [student] = await db
    .insert(schema.students)
    .values({
      profileId: ids.alumno,
      dni: "40111222",
      birthDate: "2000-05-10",
      level: "intermediate",
      status: "active",
    })
    .returning();

  // Curso dictado por el docente
  const [course] = await db
    .insert(schema.courses)
    .values({
      name: "E2E Inglés Intermedio",
      level: "intermediate",
      schedule: "Lun/Mié 18:00-19:30",
      classDays: ["monday", "wednesday"],
      classTime: "18:00:00",
      classDurationMinutes: 90,
      classroom: "Aula 1",
      maxCapacity: 15,
      teacherId: teacher.id,
      status: "active",
    })
    .returning();

  // Inscripción
  const [enrollment] = await db
    .insert(schema.enrollments)
    .values({ studentId: student.id, courseId: course.id, status: "active" })
    .returning();

  // Asistencia (presente hoy)
  await db.insert(schema.attendance).values({
    enrollmentId: enrollment.id,
    classDate: isoDate(new Date()),
    status: "present",
  });

  // Nota
  await db.insert(schema.grades).values({
    enrollmentId: enrollment.id,
    evaluationType: "parcial",
    score: "8.00",
    notes: "Buen desempeño",
  });

  // Segundo alumno APTO para promoción (≥80% asistencia, nota ≥7). Aísla al
  // Alumno E2E, cuya inscripción otros tests necesitan ACTIVA (autoevaluación).
  // El test de Promociones promueve a este (DNI 40111223), no al Alumno E2E.
  const promoProfileId = crypto.randomUUID();
  await db.insert(schema.profiles).values({
    id: promoProfileId,
    email: `promo${TEST_EMAIL_DOMAIN}`,
    role: "alumno",
    fullName: "Promo E2E",
    phone: "3516789012",
  });
  const [promoStudent] = await db
    .insert(schema.students)
    .values({ profileId: promoProfileId, dni: "40111223", birthDate: "2001-03-15", level: "intermediate", status: "active" })
    .returning();
  const [promoEnrollment] = await db
    .insert(schema.enrollments)
    .values({ studentId: promoStudent.id, courseId: course.id, status: "active" })
    .returning();
  await db.insert(schema.attendance).values({ enrollmentId: promoEnrollment.id, classDate: isoDate(new Date()), status: "present" });
  await db.insert(schema.grades).values({ enrollmentId: promoEnrollment.id, evaluationType: "parcial", score: "9.00", notes: "Apto" });

  // Pagos: uno pendiente este mes + uno vencido
  const now = new Date();
  const thisMonthDue = new Date(now.getFullYear(), now.getMonth(), 10);
  const lastMonthDue = new Date(now.getFullYear(), now.getMonth() - 1, 10);
  await db.insert(schema.payments).values([
    {
      studentId: student.id,
      amount: "15000.00",
      dueDate: isoDate(thisMonthDue),
      status: "pending",
    },
    {
      studentId: student.id,
      amount: "15000.00",
      dueDate: isoDate(lastMonthDue),
      status: "overdue",
    },
  ]);

  // Notificación para el alumno
  await db.insert(schema.notifications).values({
    userId: ids.alumno,
    type: "general",
    title: "Bienvenido a Smart Learning",
    body: "Este es un mensaje de prueba del seed E2E.",
    read: false,
  });

  // Reclamo del alumno
  await db.insert(schema.complaints).values({
    userId: ids.alumno,
    type: "academic",
    description: "Consulta de prueba generada por el seed E2E.",
    status: "open",
  });

  // Autoevaluación publicada del curso
  await db.insert(schema.assessments).values({
    courseId: course.id,
    createdBy: ids.profesor,
    weekLabel: "Semana 1 — Test",
    topic: "Present Simple",
    status: "published",
    questions: [
      {
        question: "She ___ to school every day.",
        options: ["go", "goes", "going", "gone"],
        correct: 1,
        explanation: "Tercera persona del singular en present simple: goes.",
      },
      {
        question: "They ___ playing football now.",
        options: ["is", "am", "are", "be"],
        correct: 2,
        explanation: "Sujeto plural 'they' → are.",
      },
    ],
  });

  // Campaña de marketing + consulta
  const [campaign] = await db
    .insert(schema.marketingCampaigns)
    .values({
      name: "E2E Campaña Verano",
      channel: "social_media",
      startDate: isoDate(new Date(now.getFullYear(), 0, 1)),
      budget: "50000.00",
      description: "Campaña de prueba del seed E2E.",
    })
    .returning();

  await db.insert(schema.inquiries).values({
    name: "E2E Consulta Prueba",
    email: "consulta@e2e.test",
    phone: "3516789012",
    campaignId: campaign.id,
    status: "pending",
    receivedAt: isoDate(new Date()),
  });

  // Encuesta docente (anónima)
  await db.insert(schema.teacherSurveys).values({
    teacherId: teacher.id,
    courseId: course.id,
    rating1: 5,
    rating2: 4,
    rating3: 5,
    rating4: 5,
    comment: "Encuesta de prueba del seed E2E.",
  });

  await db
    .insert(schema.teacherSurveySubmissions)
    .values({ enrollmentId: enrollment.id, courseId: course.id })
    .onConflictDoNothing();

  // Observación de clase (por dirección)
  await db.insert(schema.classObservations).values({
    teacherId: teacher.id,
    courseId: course.id,
    observedBy: ids.director,
    observedAt: isoDate(new Date()),
    overallRating: 4,
    observations: "Observación de prueba del seed E2E.",
    strengths: "Buena dinámica de clase.",
    improvements: "Ninguna.",
  });

  console.log("✅  Seed completado.");
  console.log("");
  console.log("   Usuarios de prueba (password para todos):", TEST_PASSWORD);
  for (const u of TEST_USERS) console.log(`   • ${u.role.padEnd(14)} ${u.email}`);
}

async function main() {
  await teardown();
  await seed();
  await client.end();
}

main().catch(async (err) => {
  console.error("❌  Error en el seed:", err);
  await client.end();
  process.exit(1);
});
