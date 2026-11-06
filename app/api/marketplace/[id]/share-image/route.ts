import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function isAllowedListingImageUrl(imageUrl: string) {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    return false;
  }

  if (parsedUrl.protocol !== "https:") {
    return false;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    const storageOrigin = new URL(supabaseUrl).origin;
    if (
      parsedUrl.origin === storageOrigin &&
      parsedUrl.pathname.startsWith("/storage/v1/object/public/listing-images/")
    ) {
      return true;
    }
  }

  const r2PublicUrl = process.env.R2_PUBLIC_URL;
  if (r2PublicUrl) {
    const r2Origin = new URL(r2PublicUrl).origin;
    return parsedUrl.origin === r2Origin;
  }

  return false;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { data: listing, error: listingError } = await supabaseAdmin
      .from("listings")
      .select("id")
      .eq("id", params.id)
      .eq("status", "active")
      .maybeSingle();

    if (listingError) {
      throw listingError;
    }
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const { data: image, error: imageError } = await supabaseAdmin
      .from("listing_images")
      .select("image_url")
      .eq("listing_id", listing.id)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (imageError) {
      throw imageError;
    }
    if (!image || !isAllowedListingImageUrl(image.image_url)) {
      return NextResponse.json({ error: "Listing image not found" }, { status: 404 });
    }

    const imageResponse = await fetch(image.image_url, {
      cache: "no-store",
      redirect: "error",
    });
    if (!imageResponse.ok) {
      return NextResponse.json({ error: "Unable to load listing image" }, { status: 502 });
    }

    const contentType = imageResponse.headers.get("content-type")?.split(";")[0] ?? "";
    const contentLength = Number(imageResponse.headers.get("content-length") ?? 0);
    if (
      !ALLOWED_IMAGE_TYPES.has(contentType) ||
      contentLength > MAX_IMAGE_BYTES
    ) {
      return NextResponse.json({ error: "Invalid listing image" }, { status: 415 });
    }

    const imageBytes = await imageResponse.arrayBuffer();
    if (imageBytes.byteLength > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Listing image is too large" }, { status: 413 });
    }

    return new Response(imageBytes, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(imageBytes.byteLength),
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Error in marketplace share-image route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
