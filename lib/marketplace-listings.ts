import { isSubscriptionCurrentlyActive } from "@/lib/subscription-status";
import { supabase } from "@/lib/supabase";

type RawListing = {
  id: string;
  title: string;
  price: number;
  original_price: number | null;
  seller_id: string;
  created_at: string;
  category_id: string | null;
};

export type MarketplaceListing = {
  id: string;
  title: string;
  price: number;
  original_price: number | null;
  is_boosted: boolean;
  seller_id: string;
  created_at: string;
  category_name: string | null;
  thumbnail_url: string | null;
};

export async function fetchActiveProSellerIds(sellerIds?: string[]) {
  let query = supabase
    .from("subscriptions")
    .select("user_id, status, expires_at")
    .eq("tier", "pro")
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString());

  if (sellerIds && sellerIds.length > 0) {
    query = query.in("user_id", sellerIds);
  }

  const { data: activeSubscriptions } = await query;

  return new Set(
    (activeSubscriptions ?? [])
      .filter((subscription) => isSubscriptionCurrentlyActive(subscription))
      .map((subscription) => subscription.user_id)
  );
}

export async function hydrateMarketplaceListings(listingsData: RawListing[]) {
  if (listingsData.length === 0) {
    return [] as MarketplaceListing[];
  }

  const listingIds = listingsData.map((listing) => listing.id);
  const sellerIds = Array.from(new Set(listingsData.map((listing) => listing.seller_id)));
  const categoryIds = Array.from(
    new Set(listingsData.map((listing) => listing.category_id).filter(Boolean))
  );

  const activeProSellers = await fetchActiveProSellerIds(sellerIds);

  const { data: imagesData } = await supabase
    .from("listing_images")
    .select("listing_id, image_url, sort_order")
    .in("listing_id", listingIds)
    .order("sort_order", { ascending: true });

  const imageMap = new Map<string, string>();
  if (imagesData) {
    for (const image of imagesData) {
      if (!imageMap.has(image.listing_id)) {
        imageMap.set(image.listing_id, image.image_url);
      }
    }
  }

  const categoryMap = new Map<string, string>();
  if (categoryIds.length > 0) {
    const { data: categoriesData } = await supabase
      .from("market_categories")
      .select("id, name")
      .in("id", categoryIds);

    if (categoriesData) {
      for (const category of categoriesData) {
        categoryMap.set(category.id, category.name);
      }
    }
  }

  return listingsData
    .map((listing) => ({
      id: listing.id,
      title: listing.title,
      price: listing.price,
      original_price: listing.original_price,
      is_boosted: activeProSellers.has(listing.seller_id),
      seller_id: listing.seller_id,
      created_at: listing.created_at,
      category_name: listing.category_id ? (categoryMap.get(listing.category_id) ?? null) : null,
      thumbnail_url: imageMap.get(listing.id) ?? null,
    }))
    .sort((a, b) => {
      if (a.is_boosted !== b.is_boosted) {
        return a.is_boosted ? -1 : 1;
      }

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
}