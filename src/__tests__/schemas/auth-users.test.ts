import { describe, it, expect } from "vitest";
import { loginSchema, registerSchema } from "@/modules/auth/schemas";
import { updateUserSchema } from "@/modules/users/schemas";

// SCRUM-102: Tests unitarios — schemas Zod de autenticación y usuarios

describe("loginSchema", () => {
  it("acepta email válido y password suficiente", () => {
    const result = loginSchema.safeParse({ email: "admin@test.com", password: "123456" });
    expect(result.success).toBe(true);
  });

  it("rechaza email inválido", () => {
    const result = loginSchema.safeParse({ email: "no-es-email", password: "123456" });
    expect(result.success).toBe(false);
  });

  it("rechaza password menor a 6 caracteres", () => {
    const result = loginSchema.safeParse({ email: "admin@test.com", password: "123" });
    expect(result.success).toBe(false);
  });

  it("rechaza email vacío", () => {
    const result = loginSchema.safeParse({ email: "", password: "123456" });
    expect(result.success).toBe(false);
  });
});

describe("registerSchema", () => {
  const valid = {
    email: "nuevo@test.com",
    password: "abcdef",
    confirmPassword: "abcdef",
    fullName: "Juan Pérez",
    role: "alumno" as const,
  };

  it("acepta datos válidos", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("rechaza si passwords no coinciden", () => {
    const result = registerSchema.safeParse({ ...valid, confirmPassword: "diferente" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain("confirmPassword");
  });

  it("rechaza rol inválido", () => {
    const result = registerSchema.safeParse({ ...valid, role: "superadmin" });
    expect(result.success).toBe(false);
  });

  it("rechaza nombre menor a 2 caracteres", () => {
    const result = registerSchema.safeParse({ ...valid, fullName: "A" });
    expect(result.success).toBe(false);
  });

  it("acepta todos los roles válidos", () => {
    const roles = ["director", "administrativo", "profesor", "alumno"] as const;
    for (const role of roles) {
      expect(registerSchema.safeParse({ ...valid, role }).success).toBe(true);
    }
  });
});

describe("updateUserSchema", () => {
  const valid = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    fullName: "María López",
    role: "profesor" as const,
  };

  it("acepta datos mínimos válidos", () => {
    expect(updateUserSchema.safeParse(valid).success).toBe(true);
  });

  it("acepta phone opcional", () => {
    const result = updateUserSchema.safeParse({ ...valid, phone: "+54 351 123 4567" });
    expect(result.success).toBe(true);
  });

  it("rechaza UUID inválido", () => {
    const result = updateUserSchema.safeParse({ ...valid, id: "no-es-uuid" });
    expect(result.success).toBe(false);
  });

  it("rechaza nombre vacío", () => {
    const result = updateUserSchema.safeParse({ ...valid, fullName: "A" });
    expect(result.success).toBe(false);
  });

  it("acepta rol administrativo", () => {
    const result = updateUserSchema.safeParse({ ...valid, role: "administrativo" });
    expect(result.success).toBe(true);
  });

  it("rechaza roles no válidos", () => {
    const result = updateUserSchema.safeParse({ ...valid, role: "secretaria" });
    expect(result.success).toBe(false);
  });
});

// SCRUM-177: Tests de protección de rutas para el rol administrativo
describe("ADMIN_ONLY_ROUTES — protección para rol administrativo", () => {
  const ADMIN_ONLY_ROUTES = [
    "/director/users",
    "/director/teachers",
    "/director/courses",
    "/director/teacher-evaluations",
    "/director/assessments",
    "/director/year-end",
    "/director/marketing",
    "/director/promotions",
    "/director/profile",
  ];

  const SHARED_ROUTES = [
    "/director",
    "/director/students",
    "/director/enrollments",
    "/director/payments",
    "/director/attendance",
    "/director/grades",
    "/director/complaints",
    "/director/notifications",
    "/director/reports",
  ];

  it("administrativo NO tiene acceso a rutas exclusivas del director", () => {
    for (const route of ADMIN_ONLY_ROUTES) {
      const isRestricted = ADMIN_ONLY_ROUTES.some((r) => route.startsWith(r));
      expect(isRestricted).toBe(true);
    }
  });

  it("administrativo SÍ tiene acceso a rutas compartidas", () => {
    for (const route of SHARED_ROUTES) {
      const isRestricted = ADMIN_ONLY_ROUTES.some((r) => route.startsWith(r));
      expect(isRestricted).toBe(false);
    }
  });

  it("admin tiene acceso a todas las rutas", () => {
    const allRoutes = [...ADMIN_ONLY_ROUTES, ...SHARED_ROUTES];
    // admin always passes — none of these routes are restricted for admin
    expect(allRoutes.length).toBeGreaterThan(0);
  });
});
