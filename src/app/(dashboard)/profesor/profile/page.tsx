import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/modules/profile/components/ProfileForm";

export default async function ProfesorProfilePage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone, avatar_url")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Mi Perfil</h2>
        <p className="text-sm text-slate-400 mt-0.5">Actualizá tu información personal</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-md">
        <ProfileForm
          fullName={profile.full_name}
          email={profile.email}
          phone={profile.phone}
          avatarUrl={profile.avatar_url}
        />
      </div>
    </div>
  );
}
