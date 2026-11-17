import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Heute",
    template: "%s · Lernly",
  },
  description: "Punkte sind die Währung. Dein Tagesplan für die BWL-Klausur.",
};

export default function StudyLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="study-shell min-h-screen w-full bg-bg text-text">
      {children}
    </div>
  );
}
