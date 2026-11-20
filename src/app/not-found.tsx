import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div
        className="w-full max-w-[480px] rounded-[28px] p-10 text-center text-[color:var(--color-text)]"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-ink-a14)",
          backdropFilter: "blur(24px)",
        }}
      >
        <div className="text-[44px]">🤷</div>
        <h1
          className="mt-4 text-[28px] font-semibold tracking-[-0.8px]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Diese Seite gibt&rsquo;s nicht
        </h1>
        <p className="mt-3 text-[14px]" style={{ color: "var(--color-text-faint)" }}>
          Vielleicht ein alter Link oder ein gelöschtes Pack.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-[color:var(--color-primary)] px-5 py-2.5 text-[14px] font-medium text-[color:var(--color-on-primary)] transition hover:bg-[color:var(--color-primary-press)]"
        >
          Zurück zur Startseite
        </Link>
      </div>
    </main>
  );
}
