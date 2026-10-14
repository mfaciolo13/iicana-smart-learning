import { describe, it, expect, beforeAll } from "vitest";
import { createInviteToken, verifyInviteToken, INVITE_TTL_MS } from "@/lib/auth/invite-token";

// SCRUM-267: el link de invitación es un token firmado, no base64(email)

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";

beforeAll(() => {
  process.env.SUPABASE_SECRET_KEY = "test-secret-key-for-invites";
});

describe("invite token", () => {
  it("acepta un token recién creado y devuelve el id del usuario", () => {
    expect(verifyInviteToken(createInviteToken(USER_ID))).toEqual({ userId: USER_ID });
  });

  it("rechaza el formato viejo base64(email)", () => {
    const legacy = Buffer.from("director@instituto.com").toString("base64url");
    expect(verifyInviteToken(legacy)).toBeNull();
  });

  it("rechaza un token con la firma alterada", () => {
    const [payload] = createInviteToken(USER_ID).split(".");
    expect(verifyInviteToken(`${payload}.firma-falsa`)).toBeNull();
  });

  it("rechaza un payload modificado aunque conserve la firma original", () => {
    const [, signature] = createInviteToken(USER_ID).split(".");
    const forged = Buffer.from(JSON.stringify({ u: "otro-usuario", e: Date.now() + INVITE_TTL_MS })).toString("base64url");
    expect(verifyInviteToken(`${forged}.${signature}`)).toBeNull();
  });

  it("rechaza un token vencido", () => {
    const old = createInviteToken(USER_ID, Date.now() - INVITE_TTL_MS - 1000);
    expect(verifyInviteToken(old)).toBeNull();
  });

  it("rechaza basura", () => {
    for (const bad of ["", "abc", "a.b.c", "....", "%%%.%%%"]) expect(verifyInviteToken(bad)).toBeNull();
  });
});
