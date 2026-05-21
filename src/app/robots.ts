import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/auth/", "/login/"],
      },
    ],
    sitemap: "https://lernly-app.de/sitemap.xml",
    host: "https://lernly-app.de",
  };
}
