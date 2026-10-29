"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/shared/Logo";
import { Button, buttonVariants } from "@/components/ui/Button";

export default function NotFound() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md text-center">
        <Link href="/" className="inline-flex mb-10">
          <Logo size={36} textClassName="text-xl" />
        </Link>

        {/* Ilustración: libro abierto con señalador, en la paleta de la marca */}
        <div className="flex justify-center mb-8">
          <svg width="220" height="150" viewBox="0 0 220 150" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <ellipse cx="110" cy="138" rx="78" ry="7" fill="#e1e5ea" />
            <path d="M28 36c26-10 52-10 74 0v86c-22-10-48-10-74 0z" fill="#ffffff" stroke="#c9d0d8" strokeWidth="1.5" />
            <path d="M192 36c-26-10-52-10-74 0v86c22-10 48-10 74 0z" fill="#ffffff" stroke="#c9d0d8" strokeWidth="1.5" />
            <rect x="106" y="30" width="8" height="96" rx="2" fill="#2d5383" />
            <g stroke="#e1e5ea" strokeWidth="2" strokeLinecap="round">
              <line x1="44" y1="56" x2="90" y2="52" />
              <line x1="44" y1="70" x2="90" y2="66" />
              <line x1="44" y1="84" x2="90" y2="80" />
              <line x1="44" y1="98" x2="72" y2="95" />
              <line x1="130" y1="52" x2="176" y2="56" />
              <line x1="130" y1="66" x2="176" y2="70" />
              <line x1="130" y1="80" x2="176" y2="84" />
              <line x1="130" y1="95" x2="158" y2="98" />
            </g>
            <path d="M150 22h12v34l-6-5-6 5z" fill="#bb4141" />
            <text x="60" y="30" fontFamily="var(--font-display)" fontSize="26" fontStyle="italic" fill="#86a6cc">?</text>
          </svg>
        </div>

        <div className="mb-8">
          <p className="font-display text-7xl font-light italic text-slate-300 leading-none mb-3">404</p>
          <h1 className="text-3xl text-slate-900 mb-3">Página no encontrada</h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            Esta sección todavía no existe o la dirección ingresada no es correcta.<br />
            Revisá el link o volvé al inicio.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className={buttonVariants({ variant: "primary" })}>
            Ir al inicio
          </Link>
          <Button variant="secondary" onClick={() => router.back()}>
            Volver atrás
          </Button>
        </div>

        <p className="text-xs text-slate-400 mt-10">
          © Smart Learning {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
