import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep authenticated app surfaces and API routes out of the index.
        disallow: [
          "/api/",
          "/dashboard",
          "/analytics",
          "/chat",
          "/onboarding",
          "/side-quests",
          "/rooms",
          "/fun-room",
          "/profile",
          "/login",
          "/signup",
          "/forgot-password",
        ],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
