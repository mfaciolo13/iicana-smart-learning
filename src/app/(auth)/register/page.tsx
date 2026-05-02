import { registerAction } from "@/modules/auth/actions";
import { Button } from "@/components/ui/Button";
import { Input, Field, Select } from "@/components/ui/Input";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-700 tracking-tight">IICANA</h1>
          <p className="text-sm text-slate-500 mt-1">Sistema de Gestión Académica</p>
        </div>

        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Crear cuenta</h2>

          <form action={registerAction as never} className="space-y-5">
            <Field label="Nombre completo" required id="fullName">
              <Input id="fullName" name="fullName" type="text" required placeholder="Juan Pérez" />
            </Field>

            <Field label="Email" required id="email">
              <Input id="email" name="email" type="email" required autoComplete="email" placeholder="tu@email.com" />
            </Field>

            <Field label="Rol" required id="role">
              <Select id="role" name="role" required defaultValue="">
                <option value="" disabled>Seleccioná un rol</option>
                <option value="alumno">Alumno</option>
                <option value="tutor">Tutor</option>
                <option value="profesor">Profesor</option>
                <option value="admin">Administrador</option>
              </Select>
            </Field>

            <Field label="Contraseña" required id="password">
              <Input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" placeholder="••••••••" />
            </Field>

            <Field label="Confirmar contraseña" required id="confirmPassword">
              <Input id="confirmPassword" name="confirmPassword" type="password" required autoComplete="new-password" placeholder="••••••••" />
            </Field>

            <Button type="submit" fullWidth size="lg" className="mt-2">
              Crear cuenta
            </Button>

            <p className="text-center text-sm text-slate-500">
              ¿Ya tenés cuenta?{" "}
              <a href="/login" className="text-brand-700 hover:underline font-medium">
                Iniciar sesión
              </a>
            </p>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          © IICANA Pueyrredón {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
