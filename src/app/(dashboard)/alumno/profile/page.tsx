import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/modules/profile/components/ProfileForm";
import { UserNotificationPreferencesForm } from "@/modules/notifications/components/UserNotificationPreferencesForm";
import { getUserNotificationPreferences } from "@/modules/notifications/services/notification-preferences.service";

const TABS = [
  { value: "personal", label: "Datos personales" },
  { value: "notifications", label: "Notificaciones" },
];

export default async function AlumnoProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = tab === "notifications" ? "notifications" : "personal";

  const user = await getServerUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone, avatar_url")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const preferences = activeTab === "notifications" ? await getUserNotificationPreferences(user.id) : [];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Mi Perfil</h2>
        <p className="text-sm text-slate-400 mt-0.5">Actualizá tu información personal</p>
      </div>

      <div className="flex flex-wrap gap-1 mb-4 bg-slate-100 rounded-lg p-1 w-fit max-w-full">
        {TABS.map((t) => (
          <a
            key={t.value}
            href={t.value === "personal" ? "/alumno/profile" : `/alumno/profile?tab=${t.value}`}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === t.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </a>
        ))}
      </div>

      {activeTab === "personal" ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-md">
          <ProfileForm
            fullName={profile.full_name}
            email={profile.email}
            phone={profile.phone}
            avatarUrl={profile.avatar_url}
          />
        </div>
      ) : (
        <div className="max-w-xl">
          <UserNotificationPreferencesForm preferences={preferences} />
        </div>
      )}
    </div>
  );
}
