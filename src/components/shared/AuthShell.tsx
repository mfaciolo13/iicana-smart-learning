import Link from "next/link";
import type { ReactNode } from "react";
import { Logo, LogoMark, Wordmark } from "./Logo";

/**
 * Marco de las páginas públicas (login, recuperación, invitación): panel de tinta con el
 * wordmark y una frase a la izquierda, formulario sobre papel a la derecha. En mobile el panel
 * se oculta y queda el logo arriba del formulario.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-brand-800 text-slate-50 p-10 xl:p-14">
        <Link href="/login" className="relative z-10 inline-flex items-center gap-3 w-fit">
          <LogoMark size={36} className="ring-1 ring-white/15 rounded-lg" />
          <Wordmark className="text-xl text-slate-50" />
        </Link>

        <div className="relative z-10 max-w-md">
          <p className="font-display text-4xl xl:text-[2.75rem] font-medium leading-[1.1] tracking-tight">
            La gestión del instituto, <em className="text-accent-300">en un solo cuaderno.</em>
          </p>
          <p className="mt-6 text-sm leading-relaxed text-brand-100/80 max-w-sm">
            Alumnos, cursos, asistencia, notas y pagos. Todo lo que pasa en el aula y en la oficina,
            ordenado y a mano.
          </p>
        </div>

        <p className="relative z-10 text-xs text-brand-200/70">
          © Smart Learning {year} · Sistema de gestión académica
        </p>

        {/* Decoración: anillos concéntricos en la esquina */}
        <svg
          className="absolute -right-32 -bottom-40 w-[640px] h-[640px] text-brand-300/25"
          viewBox="0 0 640 640"
          fill="none"
          aria-hidden="true"
        >
          {[300, 250, 200, 150, 100].map((r) => (
            <circle key={r} cx="320" cy="320" r={r} stroke="currentColor" strokeWidth="1" />
          ))}
          <circle cx="320" cy="320" r="48" fill="currentColor" fillOpacity="0.5" />
        </svg>
      </aside>

      <main className="flex flex-col min-h-screen px-5 py-8 sm:px-10">
        <div className="lg:hidden flex justify-center mb-10">
          <Link href="/login">
            <Logo size={36} textClassName="text-xl" />
          </Link>
        </div>

        <div className="m-auto w-full max-w-[420px]">{children}</div>

        <p className="lg:hidden text-center text-xs text-slate-400 mt-10">© Smart Learning {year}</p>
      </main>
    </div>
  );
}
