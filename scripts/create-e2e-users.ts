/**
 * Crea los usuarios dedicados para tests E2E en Supabase.
 * Correr una sola vez: npx tsx scripts/create-e2e-users.ts
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const alumnoEmail = process.env.E2E_ALUMNO_EMAIL;
const alumnoPassword = process.env.E2E_ALUMNO_PASSWORD;

if (!url || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local");
  process.exit(1);
}
if (!adminEmail || !adminPassword || !alumnoEmail || !alumnoPassword) {
  console.error("Faltan E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, E2E_ALUMNO_EMAIL o E2E_ALUMNO_PASSWORD en .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function createUser(email: string, password: string, role: "admin" | "alumno", fullName: string) {
  console.log(`\nCreando usuario ${role}: ${email}`);

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  let userId: string;

  if (error) {
    if (error.message.includes("already been registered")) {
      console.log(`  → Ya existe en auth, actualizando profile`);
      const { data: users } = await supabase.auth.admin.listUsers();
      const existing = users.users.find((u) => u.email === email);
      if (!existing) throw new Error(`No se pudo encontrar el usuario existente: ${email}`);
      userId = existing.id;
    } else {
      throw new Error(`Error creando auth user: ${error.message}`);
    }
  } else {
    userId = data.user.id;
    console.log(`  → Auth user creado: ${userId}`);
  }

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: userId,
    email,
    role,
    full_name: fullName,
  });

  if (profileError) {
    throw new Error(`Error creando profile: ${profileError.message}`);
  }

  console.log(`  → Profile upserted con rol "${role}"`);
  return userId;
}

async function main() {
  console.log("=== Creando usuarios E2E ===");

  await createUser(adminEmail!, adminPassword!, "admin", "E2E Admin");
  await createUser(alumnoEmail!, alumnoPassword!, "alumno", "E2E Alumno");

  console.log("\n✓ Usuarios E2E creados correctamente.");
  console.log("  Recordá agregar las credenciales como GitHub Secrets (SCRUM-156):");
  console.log(`  E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, E2E_ALUMNO_EMAIL, E2E_ALUMNO_PASSWORD`);
}

main().catch((err) => {
  console.error("\n✗ Error:", err.message);
  process.exit(1);
});
