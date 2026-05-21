import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://lernly-app.de";
  const lastModified = new Date();

  return [
    {
      url: baseUrl,
      lastModified,
      changeFrequency: "weekly",
      priority: 1.0,
      alternates: {
        languages: {
          de: baseUrl,
          en: `${baseUrl}/?lang=en`,
        },
      },
    },
    {
      url: `${baseUrl}/impressum`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/datenschutz`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/agb`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
