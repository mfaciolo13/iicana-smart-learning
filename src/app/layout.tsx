import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

// Identidad tipográfica (ver docs/IDENTIDAD_VISUAL.md): Manrope para la interfaz,
// Fraunces (serif con ejes ópticos) para títulos, cifras grandes y el wordmark.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT"],
});

export const metadata: Metadata = {
  title: "Smart Learning",
  description: "Sistema de gestión académica para institutos de inglés",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${manrope.variable} ${fraunces.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Toaster
          richColors
          position="top-right"
          toastOptions={{ style: { fontFamily: "var(--font-sans)" } }}
        />
      </body>
    </html>
  );
}
