"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="ml-auto px-4 py-2 bg-brand-700 text-white text-sm font-medium rounded-lg hover:bg-brand-800"
    >
      Imprimir / Guardar PDF
    </button>
  );
}
