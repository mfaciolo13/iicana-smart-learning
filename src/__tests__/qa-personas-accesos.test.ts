import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { isUuid } from "@/lib/uuid";
import { safeNextPath } from "@/lib/auth/safe-next";
import { normalizePhoneInput } from "@/lib/validation";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
}

describe("ids en la URL", () => {
  it("solo acepta uuid", () => {
    expect(isUuid("123e4567-e89b-42d3-a456-426614174000")).toBe(true);
    for (const bad of ["abc", "123", "' OR 1=1--", "123e4567-e89b-42d3-a456-42661417400", "../etc/passwd", "", undefined, null, 5]) {
      expect(isUuid(bad)).toBe(false);
    }
  });

  it("toda página con un segmento dinámico responde 404 ante un id malformado (en vez de un error de SQL)", () => {
    const pages = walk(join(process.cwd(), "src/app/(dashboard)")).filter((f) => /page\.tsx$/.test(f) && /\[[^\]]+\]/.test(f));
    expect(pages.length).toBeGreaterThan(10);
    const unguarded = pages.filter((f) => /await params/.test(readFileSync(f, "utf8")) && !/isUuid\(/.test(readFileSync(f, "utf8")));
    expect(unguarded).toEqual([]);
  });
});

describe("volver al destino original después de iniciar sesión", () => {
  it("acepta rutas del propio portal", () => {
    expect(safeNextPath("/director/students", "director")).toBe("/director/students");
    expect(safeNextPath("/alumno/payments?mp=success", "alumno")).toBe("/alumno/payments?mp=success");
    expect(safeNextPath("/director", "director")).toBe("/director");
  });

  it("rechaza URLs externas, rutas de otro portal y trucos de redirección", () => {
    for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "/director/students", "/directorio", "javascript:alert(1)", "", null, undefined, 3]) {
      expect(safeNextPath(bad, "alumno")).toBeNull();
    }
    expect(safeNextPath("/alumno/\u0000x", "alumno")).toBeNull();
  });

  it("el proxy guarda el destino y el login lo valida en el servidor", () => {
    expect(read("src/proxy.ts")).toContain('login.searchParams.set("next"');
    expect(read("src/modules/auth/actions.ts")).toContain("safeNextPath(formData.get(\"next\"), role)");
  });
});

describe("teléfono", () => {
  it("conserva un número nacional ya normalizado", () => {
    expect(normalizePhoneInput("3511234567")).toBe("3511234567");
  });

  it("no confunde un número que empieza con 54 sin código de país", () => {
    // Un número nacional de 10 dígitos que empieza con 54 no lleva código de país.
    expect(normalizePhoneInput("5412345678")).toBe("5412345678");
  });

  it("convierte el formato internacional que ya está guardado", () => {
    expect(normalizePhoneInput("+543513733710")).toBe("3513733710");
    expect(normalizePhoneInput("+54 9 351 373 3710")).toBe("3513733710");
  });
});

describe("baja de personas (código)", () => {
  it("cambiar el rol no deja a nadie sin legajo", () => {
    const svc = read("src/modules/users/services/users.service.ts");
    expect(svc).toContain("checkRoleChange");
    expect(read("src/modules/users/actions.ts")).toContain("checkRoleChange(parsed.data.id, parsed.data.role)");
  });

  it("el detalle de usuario distingue una cuenta que nunca ingresó", () => {
    expect(read("src/modules/users/services/users.service.ts")).toContain("const emailConfirmed = !!data?.user?.last_sign_in_at;");
  });

  it("desactivar a un usuario cierra sus sesiones abiertas", () => {
    expect(read("src/modules/users/services/users.service.ts")).toContain("delete from auth.sessions where user_id");
  });

  it("reactivar un alumno dado de baja le devuelve el acceso", () => {
    const src = read("src/modules/students/actions.ts");
    expect(src).toContain('previous?.status === "inactive" && parsed.data.status === "active"');
    expect(src).toContain('ban_duration: "none"');
  });

  it("dar de baja a un docente conserva sus evaluaciones y bloquea su cuenta", () => {
    const src = read("src/modules/teachers/actions.ts");
    expect(src).toContain("getTeacherRemovalInfo");
    expect(src).toContain('ban_duration: "87600h"');
    expect(src).toContain("unassignTeacherCourses");
  });

  it("un fallo del correo de invitación ya no se muestra como éxito", () => {
    for (const f of ["src/modules/students/actions.ts", "src/modules/teachers/actions.ts", "src/modules/users/actions.ts"]) {
      expect(read(f)).not.toMatch(/sendInvitationEmail\(\{[^}]*\}\)\.catch\(\(\) => \{\}\)/);
    }
  });

  it("el teléfono vacío borra el dato en vez de ignorarse", () => {
    expect(read("src/modules/students/actions.ts")).toContain("phone: null");
    expect(read("src/modules/teachers/actions.ts")).toContain("phone: null");
  });
});

describe("etiquetas de nivel", () => {
  it("ninguna pantalla redefine LEVEL_LABELS: todas usan @/lib/level-labels", () => {
    const offenders = walk(join(process.cwd(), "src"))
      .filter((f) => /\.(ts|tsx)$/.test(f) && !f.includes("__tests__") && !f.endsWith("level-labels.ts"))
      .filter((f) => /beginner:\s*"/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});
