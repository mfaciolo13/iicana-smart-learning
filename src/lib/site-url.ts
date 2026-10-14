import { headers } from "next/headers";
import { createInviteToken } from "@/lib/auth/invite-token";

/**
 * URL pública del sitio. Prefiere NEXT_PUBLIC_SITE_URL para no armar links de invitación o de
 * recuperación con headers que controla quien hace el request (SCRUM-314). Si no está
 * configurada, usa los headers como antes.
 */
export async function getSiteUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Link de invitación firmado para un usuario (ver lib/auth/invite-token.ts). */
export async function buildInviteUrl(userId: string): Promise<string> {
  return `${await getSiteUrl()}/invite/${createInviteToken(userId)}`;
}
