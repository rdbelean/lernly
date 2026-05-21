export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div
        className="w-full max-w-[480px] rounded-[28px] p-10 text-center text-white"
        style={{
          background: "rgba(20, 22, 28, 0.78)",
          border: "1px solid rgba(255, 255, 255, 0.22)",
          backdropFilter: "blur(24px)",
        }}
      >
        <div className="text-[44px]">🤷</div>
        <h1
          className="mt-4 text-[28px] font-bold tracking-[-0.8px]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Diese Seite gibt's nicht
        </h1>
        <p className="mt-3 text-[14px]" style={{ color: "rgba(255,255,255,0.6)" }}>
          Vielleicht ein alter Link oder ein gelöschtes Pack.
        </p>
        <a
          href="/"
          className="mt-6 inline-block rounded-full bg-white px-5 py-2.5 text-[14px] font-medium text-[color:var(--color-ln-bg-bot)] transition hover:bg-white/90"
        >
          Zurück zur Startseite
        </a>
      </div>
    </main>
  );
}
