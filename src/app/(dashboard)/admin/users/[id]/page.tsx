import { notFound } from "next/navigation";
import Link from "next/link";
import { getUserDetail } from "@/modules/users/services/users.service";
import { updateUserAction, banUserAction, unbanUserAction, resendInvitationAction } from "@/modules/users/actions";
import { UserEditForm } from "@/modules/users/components/UserEditForm";
import { FormButton } from "@/components/ui/FormButton";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

const ROLE_CONFIG: Record<string, { label: string; variant: "info" | "success" | "warning" | "neutral" }> = {
  admin: { label: "Admin", variant: "warning" },
  profesor: { label: "Docente", variant: "info" },
  alumno: { label: "Alumno", variant: "success" },
  tutor: { label: "Tutor", variant: "neutral" },
};

const AVATAR_GRADIENTS: Record<string, string> = {
  admin: "linear-gradient(135deg, #f59e0b, #d97706)",
  profesor: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
  alumno: "linear-gradient(135deg, #10b981, #059669)",
  tutor: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
};

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUserDetail(id);
  if (!user) notFound();

  const roleCfg = ROLE_CONFIG[user.role] ?? { label: user.role, variant: "neutral" as const };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <Link href="/admin/users" className="text-sm text-slate-400 hover:text-slate-600 mb-1 block">
            ← Usuarios
          </Link>
          <h2 className="text-2xl font-bold text-slate-900">{user.fullName}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          {user.banned && <Badge variant="danger">Desactivado</Badge>}
          <Badge variant={roleCfg.variant} dot={false}>{roleCfg.label}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <UserEditForm
            userId={user.id}
            fullName={user.fullName}
            phone={user.phone}
            role={user.role}
            action={updateUserAction}
          />
        </div>

        <div className="space-y-4">
          <Card title="Perfil" padding="md">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                style={{ background: AVATAR_GRADIENTS[user.role] ?? "linear-gradient(135deg,#64748b,#475569)" }}
              >
                {getInitials(user.fullName)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{user.fullName}</p>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-400">Alta</dt>
                <dd className="text-slate-700">{new Date(user.createdAt).toLocaleDateString("es-AR")}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Estado</dt>
                <dd>
                  {user.banned
                    ? <span className="text-red-600 font-medium text-xs">Desactivado</span>
                    : <span className="text-emerald-600 font-medium text-xs">Activo</span>
                  }
                </dd>
              </div>
            </dl>
          </Card>

          <Card title="Acceso al sistema" padding="md">
            {user.banned ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Este usuario no puede iniciar sesión. Reactivalo para restaurar el acceso.
                </p>
                <FormButton
                  action={unbanUserAction}
                  fields={{ id: user.id }}
                  variant="primary"
                  size="sm"
                  className="w-full justify-center"
                >
                  Reactivar usuario
                </FormButton>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Desactivar impide que el usuario inicie sesión. Sus datos se conservan.
                </p>
                <FormButton
                  action={banUserAction}
                  fields={{ id: user.id }}
                  variant="danger"
                  size="sm"
                  className="w-full justify-center"
                  confirmMessage={`¿Desactivar a ${user.fullName}? No podrá iniciar sesión.`}
                >
                  Desactivar usuario
                </FormButton>
              </div>
            )}
            <div className="pt-3 mt-3 border-t border-slate-100">
              <FormButton
                action={resendInvitationAction}
                fields={{ email: user.email, fullName: user.fullName, role: user.role }}
                variant="ghost"
                size="sm"
                className="w-full justify-center text-slate-600"
                confirmMessage={`¿Reenviar invitación a ${user.email}?`}
              >
                Reenviar invitación por email
              </FormButton>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
