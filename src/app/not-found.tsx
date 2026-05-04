"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md text-center">

        {/* Logo */}
        <div className="inline-flex items-center gap-2.5 mb-10">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" }}
          >
            <svg width="19" height="19" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polygon points="10,2 18,6.5 10,11 2,6.5" fill="white" />
              <path d="M4 8v3.5C4 14.5 7 16 10 16s6-1.5 6-4.5V8Z" fill="white" fillOpacity="0.3" />
            </svg>
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">Smart Learning</span>
        </div>

        {/* Illustration */}
        <div className="flex justify-center mb-8">
          <svg width="220" height="180" viewBox="0 0 220 180" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            {/* Floor shadow */}
            <ellipse cx="110" cy="165" rx="72" ry="8" fill="#e2e8f0" />

            {/* Open book body */}
            <rect x="34" y="80" width="68" height="78" rx="4" fill="#dbeafe" stroke="#93c5fd" strokeWidth="1.5" />
            <rect x="118" y="80" width="68" height="78" rx="4" fill="#dbeafe" stroke="#93c5fd" strokeWidth="1.5" />
            {/* Book spine */}
            <rect x="102" y="78" width="16" height="82" rx="2" fill="#3b82f6" />
            {/* Book pages lines left */}
            <line x1="46" y1="100" x2="90" y2="100" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="46" y1="112" x2="90" y2="112" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="46" y1="124" x2="90" y2="124" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="46" y1="136" x2="74" y2="136" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" />
            {/* Book pages lines right */}
            <line x1="130" y1="100" x2="174" y2="100" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="130" y1="112" x2="174" y2="112" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="130" y1="124" x2="174" y2="124" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="130" y1="136" x2="158" y2="136" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" />

            {/* Character body */}
            <circle cx="110" cy="46" r="28" fill="#fef3c7" stroke="#fcd34d" strokeWidth="1.5" />
            {/* Eyes — looking around lost */}
            <circle cx="101" cy="42" r="4" fill="white" />
            <circle cx="119" cy="42" r="4" fill="white" />
            <circle cx="103" cy="43" r="2" fill="#1e293b" />
            <circle cx="121" cy="43" r="2" fill="#1e293b" />
            {/* Mouth — confused/sad curve */}
            <path d="M104 54 Q110 50 116 54" stroke="#92400e" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            {/* Eyebrow left tilted — confused */}
            <path d="M97 35 Q101 32 105 35" stroke="#92400e" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            {/* Eyebrow right raised */}
            <path d="M115 33 Q119 36 123 34" stroke="#92400e" strokeWidth="1.5" strokeLinecap="round" fill="none" />

            {/* Question marks floating */}
            <text x="152" y="38" fontSize="18" fill="#3b82f6" fontWeight="bold" opacity="0.7">?</text>
            <text x="52" y="44" fontSize="14" fill="#6366f1" fontWeight="bold" opacity="0.5">?</text>
            <text x="164" y="62" fontSize="11" fill="#8b5cf6" fontWeight="bold" opacity="0.4">?</text>

            {/* Graduation cap on head */}
            <rect x="88" y="19" width="44" height="6" rx="2" fill="#1d4ed8" />
            <polygon points="110,8 132,19 88,19" fill="#2563eb" />
            <line x1="132" y1="19" x2="136" y2="30" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
            <circle cx="136" cy="31" r="2.5" fill="#fbbf24" />
          </svg>
        </div>

        {/* Text */}
        <div className="mb-8">
          <p className="text-6xl font-black text-slate-200 leading-none mb-2">404</p>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Página no encontrada</h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            Esta sección todavía no existe o la dirección ingresada no es correcta.<br />
            Revisá el link o volvé al inicio.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Ir al inicio
          </Link>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-700 text-sm font-medium border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Volver atrás
          </button>
        </div>

        <p className="text-xs text-slate-400 mt-10">
          © Smart Learning {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
