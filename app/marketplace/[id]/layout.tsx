import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-config";

export const revalidate = 60;

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id)) {
    return {};
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return {};
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: listing } = await supabase
    .from("listings")
    .select("id, title, price")
    .eq("id", params.id)
    .eq("status", "active")
    .maybeSingle();

  if (!listing) {
    return {};
  }

  const { data: listingImage } = await supabase
    .from("listing_images")
    .select("image_url")
    .eq("listing_id", listing.id)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  const title = listing.title;
  const description = `KES ${listing.price.toLocaleString("en-KE")}`;
  let image: string | undefined;

  if (listingImage?.image_url) {
    const imageUrl = listingImage.image_url;
    const hostname = new URL(imageUrl).hostname;
    image =
      hostname.endsWith(".r2.dev") || hostname.endsWith(".supabase.co")
        ? `${SITE_URL}/_next/image?url=${encodeURIComponent(imageUrl)}&w=640&q=75`
        : imageUrl;
  }

  return {
    title,
    description,
    openGraph: {
      type: "website",
      title,
      description,
      url: `${SITE_URL}/marketplace/${params.id}`,
      ...(image ? { images: [{ url: image, alt: title }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : [],
    },
  };
}
