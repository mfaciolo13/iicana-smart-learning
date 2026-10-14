import { unstable_cache } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";

export const getCachedTeachers = unstable_cache(
  async () => {
    const supabase = createServiceClient();
    const { data: rows } = await supabase
      .from("teachers")
      .select("id, profile_id, dni, specialization");
    const profileIds = (rows ?? []).map((t) => t.profile_id);
    const { data: profiles } = profileIds.length > 0
      ? await supabase.from("profiles").select("id, full_name, email").in("id", profileIds)
      : { data: [] as { id: string; full_name: string; email: string }[] };
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    return (rows ?? [])
      .map((t) => {
        const profile = profileMap.get(t.profile_id);
        return {
          id: t.id,
          dni: t.dni,
          specialization: t.specialization as string | null,
          fullName: profile?.full_name ?? "",
          email: profile?.email ?? "",
        };
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  },
  ["teachers"],
  { revalidate: 300, tags: ["teachers"] }
);

export const getCachedStudents = unstable_cache(
  async () => {
    const supabase = createServiceClient();
    const { data: rows } = await supabase
      .from("students")
      .select("id, profile_id, dni, level, status");
    const profileIds = (rows ?? []).map((s) => s.profile_id);
    const { data: profiles } = profileIds.length > 0
      ? await supabase.from("profiles").select("id, full_name, email").in("id", profileIds)
      : { data: [] as { id: string; full_name: string; email: string }[] };
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    return (rows ?? [])
      .map((s) => {
        const profile = profileMap.get(s.profile_id);
        return {
          id: s.id,
          dni: s.dni,
          level: s.level as string | null,
          status: s.status as string,
          fullName: profile?.full_name ?? "",
          email: profile?.email ?? "",
        };
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  },
  ["students"],
  { revalidate: 300, tags: ["students"] }
);
