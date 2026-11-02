import { db, dbTx } from "@/lib/drizzle";
import { auditLog } from "@/lib/drizzle/schema";
import { getServerProfile, type UserRole } from "@/lib/auth/helpers";

type Tx = Parameters<Parameters<typeof dbTx.transaction>[0]>[0];
/** Cliente normal o transacción: los servicios reciben cualquiera de los dos. */
export type DbExecutor = typeof db | Tx;

/** Quién ejecuta una operación sensible (se guarda desnormalizado en auditoría y caja). */
export interface Actor {
  id: string;
  name: string;
  role: UserRole;
}

/** Actor de la sesión actual; null si no hay sesión válida. */
export async function getCurrentActor(): Promise<Actor | null> {
  const profile = await getServerProfile();
  if (!profile) return null;
  return { id: profile.id, name: profile.full_name, role: profile.role as UserRole };
}

/** Actor de procesos automáticos (crons, webhooks). */
export const SYSTEM_ACTOR: Actor = { id: "00000000-0000-0000-0000-000000000000", name: "Sistema", role: "director" };

export interface AuditEntry {
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  note?: string | null;
}

/**
 * Registra una operación en audit_log. Pasale la transacción de la operación para que el
 * rastro y el cambio se confirmen (o se deshagan) juntos.
 */
export async function recordAudit(exec: DbExecutor, actor: Actor | null, entry: AuditEntry): Promise<void> {
  await exec.insert(auditLog).values({
    actorId: actor?.id === SYSTEM_ACTOR.id ? null : (actor?.id ?? null),
    actorName: actor?.name ?? null,
    actorRole: actor ? (actor.id === SYSTEM_ACTOR.id ? "system" : actor.role) : null,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    before: (entry.before ?? null) as never,
    after: (entry.after ?? null) as never,
    note: entry.note ?? null,
  });
}
