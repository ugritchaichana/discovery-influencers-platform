import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#050505] px-6 py-16 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.16),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(46,125,255,0.18),transparent_65%)] mix-blend-screen" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(140deg,rgba(9,9,9,0.95),rgba(5,5,5,0.85))]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[radial-gradient(ellipse_at_bottom,rgba(255,255,255,0.12),transparent_55%)]" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center">
        <div className="w-full max-w-6xl">
          {children}
        </div>
      </div>
    </div>
  );
}
