import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/helpers";
import { db } from "@/lib/drizzle";
import { profiles } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";
import { ProfileForm } from "@/modules/profile/components/ProfileForm";

export default async function TutorProfilePage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const [profile] = await db
    .select({
      fullName: profiles.fullName,
      email: profiles.email,
      phone: profiles.phone,
      avatarUrl: profiles.avatarUrl,
    })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  if (!profile) redirect("/login");

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Mi Perfil</h2>
        <p className="text-sm text-slate-400 mt-0.5">Actualizá tu información personal</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-md">
        <ProfileForm
          fullName={profile.fullName}
          email={profile.email}
          phone={profile.phone}
          avatarUrl={profile.avatarUrl}
        />
      </div>
    </div>
  );
}
