import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { matchesSearch, normalizeSearch } from "@/lib/search";

// SCRUM-271: los endpoints de cron exigen CRON_SECRET en todos los entornos
describe("isAuthorizedCron", () => {
  const original = process.env.CRON_SECRET;
  beforeEach(() => {
    process.env.CRON_SECRET = "secreto-de-prueba";
  });
  afterEach(() => {
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
  });

  const req = (auth?: string) => new Request("https://x.test/api/cron/x", { headers: auth ? { authorization: auth } : {} });

  it("acepta el secreto correcto", () => {
    expect(isAuthorizedCron(req("Bearer secreto-de-prueba"))).toBe(true);
  });

  it("rechaza sin header, con secreto incorrecto o con otro esquema", () => {
    expect(isAuthorizedCron(req())).toBe(false);
    expect(isAuthorizedCron(req("Bearer otro"))).toBe(false);
    expect(isAuthorizedCron(req("secreto-de-prueba"))).toBe(false);
  });

  it('si CRON_SECRET no está configurada, rechaza todo (incluido "Bearer undefined")', () => {
    delete process.env.CRON_SECRET;
    expect(isAuthorizedCron(req("Bearer undefined"))).toBe(false);
    expect(isAuthorizedCron(req())).toBe(false);
  });
});

// SCRUM-273: búsqueda insensible a mayúsculas y acentos
describe("búsqueda sin acentos", () => {
  it("normaliza", () => {
    expect(normalizeSearch("  ÑANDÚ Pérez ")).toBe("nandu perez");
  });

  it('"nandu" encuentra "Ñandú"', () => {
    expect(matchesSearch("QA Uno Ñandú Pérez", "nandu")).toBe(true);
    expect(matchesSearch("QA Uno Ñandú Pérez", "PEREZ")).toBe(true);
  });

  it("no encuentra lo que no está y tolera nulos", () => {
    expect(matchesSearch("Ana", "luis")).toBe(false);
    expect(matchesSearch(null, "a")).toBe(false);
    expect(matchesSearch("Ana", "")).toBe(true);
  });
});
