import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"], // Melindungi endpoint API
    },
    sitemap: "https://expense.my.id/sitemap.xml",
  };
}
