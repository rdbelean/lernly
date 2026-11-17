import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Lernly – Aus deinem Lernstoff wird echtes Verstehen.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const logo = await readFile(join(process.cwd(), "public/lernly-icon-192.png"));
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", background: "#fcfcfc", color: "#191a20", padding: 70, flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 17, fontSize: 37 }}>
        {/* ImageResponse embeds the local brand asset directly. */}
        <img src={"data:image/png;base64," + logo.toString("base64")} width={55} height={55} alt="" />
        <span>lernly.</span>
        <span style={{ marginLeft: "auto", fontSize: 20, color: "#7b8090" }}>Dein Lerntrainer</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", fontSize: 83, letterSpacing: -4, lineHeight: 1.14, marginTop: 70 }}>
        <span>Aus deinem Lernstoff</span><span style={{ color: "#121212" }}>wird echtes Verstehen</span>
      </div>
      <div style={{ display: "flex", marginTop: 30, fontSize: 24, color: "#7b8090" }}>Verstehen, üben und wiederholen. Bis es klickt.</div>
      <div style={{ display: "flex", gap: 15, marginTop: "auto" }}>
        {["Corporate Finance", "Mathematik", "Marketing"].map(label => <span key={label} style={{ display: "flex", padding: "12px 20px", border: "1px solid #e0e5f3", borderRadius: 8, color: "#687799", background: "#f0f3fb", fontSize: 18 }}>{label}</span>)}
      </div>
    </div>, size,
  );
}
