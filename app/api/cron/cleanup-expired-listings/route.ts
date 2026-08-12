import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExpiredListing = {
  id: string;
  seller_id: string;
  expires_at: string;
};

type ListingImageRow = {
  image_url: string;
};

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setHours(cutoff.getHours() - 48);

  const summary = {
    matchedExpired: 0,
    skippedPro: 0,
    deletedListings: 0,
    deletedImages: 0,
    errors: [] as string[],
  };

  const { data: expiredListings, error: expiredListingsError } = await supabaseAdmin
    .from("listings")
    .select("id, seller_id, expires_at")
    .eq("status", "expired")
    .lt("expires_at", cutoff.toISOString());

  if (expiredListingsError) {
    summary.errors.push(`Failed to query expired listings: ${expiredListingsError.message}`);
    console.log("cleanup-expired-listings summary", summary);
    return NextResponse.json(summary, { status: 500 });
  }

  const listings = (expiredListings ?? []) as ExpiredListing[];
  summary.matchedExpired = listings.length;

  if (listings.length === 0) {
    console.log("cleanup-expired-listings summary", summary);
    return NextResponse.json(summary);
  }

  const sellerIds = Array.from(new Set(listings.map((listing) => listing.seller_id)));

  const { data: activeProSubscriptions, error: proSubsError } = await supabaseAdmin
    .from("subscriptions")
    .select("user_id")
    .in("user_id", sellerIds)
    .eq("tier", "pro")
    .eq("status", "active")
    .gt("expires_at", now.toISOString());

  if (proSubsError) {
    summary.errors.push(`Failed to query active Pro subscriptions: ${proSubsError.message}`);
    console.log("cleanup-expired-listings summary", summary);
    return NextResponse.json(summary, { status: 500 });
  }

  const protectedProSellers = new Set((activeProSubscriptions ?? []).map((row) => row.user_id));
  const bucketBase = supabaseAdmin.storage.from("listing-images").getPublicUrl("").data.publicUrl;

  for (const listing of listings) {
    if (protectedProSellers.has(listing.seller_id)) {
      summary.skippedPro += 1;
      continue;
    }

    const { data: imageRows, error: imageRowsError } = await supabaseAdmin
      .from("listing_images")
      .select("image_url")
      .eq("listing_id", listing.id);

    if (imageRowsError) {
      summary.errors.push(`Listing ${listing.id}: failed to fetch images (${imageRowsError.message})`);
      continue;
    }

    const storagePaths = ((imageRows ?? []) as ListingImageRow[])
      .map((row) => {
        if (row.image_url.startsWith(bucketBase)) {
          return decodeURIComponent(row.image_url.slice(bucketBase.length));
        }
        return null;
      })
      .filter(Boolean) as string[];

    if (storagePaths.length > 0) {
      const { error: storageDeleteError } = await supabaseAdmin.storage
        .from("listing-images")
        .remove(storagePaths);

      if (storageDeleteError) {
        summary.errors.push(`Listing ${listing.id}: failed to remove images (${storageDeleteError.message})`);
      } else {
        summary.deletedImages += storagePaths.length;
      }
    }

    const { error: listingDeleteError } = await supabaseAdmin
      .from("listings")
      .delete()
      .eq("id", listing.id);

    if (listingDeleteError) {
      summary.errors.push(`Listing ${listing.id}: failed to delete listing (${listingDeleteError.message})`);
      continue;
    }

    summary.deletedListings += 1;
  }

  console.log("cleanup-expired-listings summary", summary);
  return NextResponse.json(summary);
}
