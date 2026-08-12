import { MetadataRoute } from "next";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://www.campusvault.top";
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/browse`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/marketplace`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/choose`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/marketplace/pro`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${baseUrl}/support`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/signup`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/forgot-password`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${baseUrl}/reset-password`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.1 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.1 },
  ];

  const { data: listings } = await supabaseAdmin
    .from("listings")
    .select("id, created_at")
    .eq("status", "active");

  const listingRoutes: MetadataRoute.Sitemap = (listings ?? []).map((listing) => ({
    url: `${baseUrl}/marketplace/${listing.id}`,
    lastModified: new Date(listing.created_at),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...listingRoutes];
}
