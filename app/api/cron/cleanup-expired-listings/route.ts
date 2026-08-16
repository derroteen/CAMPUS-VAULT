import { NextRequest, NextResponse } from "next/server";
import { deleteImageByUrl } from "@/lib/image-storage";
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

    const imageUrls = ((imageRows ?? []) as ListingImageRow[]).map((row) => row.image_url);

    if (imageUrls.length > 0) {
      let failedDelete = false;

      for (const imageUrl of imageUrls) {
        try {
          await deleteImageByUrl(imageUrl);
          summary.deletedImages += 1;
        } catch (error) {
          failedDelete = true;
          const message = error instanceof Error ? error.message : "Unknown error";
          summary.errors.push(`Listing ${listing.id}: failed to remove image ${imageUrl} (${message})`);
        }
      }

      if (failedDelete) {
        continue;
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
