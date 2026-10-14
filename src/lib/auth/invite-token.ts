import { createHmac, timingSafeEqual } from "node:crypto";

// SCRUM-267: el link de invitación ya no es base64(email) (adivinable por cualquiera).
// Es un token firmado con HMAC que lleva el id del usuario y un vencimiento. Además, al
// reclamarlo se rechaza toda cuenta que ya inició sesión alguna vez (ver la página
// /invite/[token]), por lo que en la práctica sólo sirve para activar la cuenta una vez.

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function signingKey(): Buffer {
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY no está configurada: no se pueden firmar invitaciones.");
  // Clave derivada: la service role nunca se usa directamente como secreto de firma.
  return createHmac("sha256", key).update("smart-learning:invite:v1").digest();
}

function sign(payload: string): string {
  return createHmac("sha256", signingKey()).update(payload).digest("base64url");
}

export function createInviteToken(userId: string, now: number = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ u: userId, e: now + INVITE_TTL_MS })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** Devuelve el id del usuario si el token es auténtico y no venció; si no, null. */
export function verifyInviteToken(token: string, now: number = Date.now()): { userId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;

  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8")) as { u?: unknown; e?: unknown };
    if (typeof data.u !== "string" || typeof data.e !== "number") return null;
    if (data.e < now) return null;
    return { userId: data.u };
  } catch {
    return null;
  }
}
