import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lernly",
    short_name: "Lernly",
    description:
      "Lernly macht aus deinen Kursmaterialien ein komplettes Lernpaket.",
    start_url: "/",
    display: "standalone",
    background_color: "#091264",
    theme_color: "#1421C5",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/lernly-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/lernly-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
