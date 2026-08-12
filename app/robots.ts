import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/dashboard",
        "/api/",
        "/auth/callback",
        "/upload",
        "/marketplace/my-listings",
        "/marketplace/wishlist",
        "/marketplace/new",
        "/marketplace/*/edit",
      ],
    },
    sitemap: "https://www.campusvault.top/sitemap.xml",
  };
}
