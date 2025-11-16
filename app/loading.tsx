export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-white">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="loading-orbit" aria-hidden="true">
          <span className="loading-dot" />
          <span className="loading-dot" />
          <span className="loading-dot" />
          <span className="loading-core" />
        </div>
        <div>
          <p className="text-lg font-semibold tracking-[0.2em]">Warming up data</p>
          <p className="text-sm text-white/60">
            Please wait while we prepare your personalized dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
