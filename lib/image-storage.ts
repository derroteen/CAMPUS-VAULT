import { deleteFromR2 } from "@/lib/r2-storage";
import { supabaseAdmin } from "@/lib/supabase-admin";

const SUPABASE_STORAGE_HOSTNAME = "ypafwgszpblsrvesijzl.supabase.co";
const SUPABASE_LISTING_IMAGES_PREFIX = `https://${SUPABASE_STORAGE_HOSTNAME}/storage/v1/object/public/listing-images/`;

function isNotFoundMessage(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("not found") || normalized.includes("404") || normalized.includes("no such");
}

export async function deleteImageByUrl(imageUrl: string): Promise<void> {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    console.warn("deleteImageByUrl: invalid image URL", imageUrl);
    return;
  }

  if (parsedUrl.hostname === SUPABASE_STORAGE_HOSTNAME) {
    if (!imageUrl.startsWith(SUPABASE_LISTING_IMAGES_PREFIX)) {
      console.warn("deleteImageByUrl: unexpected Supabase image URL shape", imageUrl);
      return;
    }

    const storagePath = decodeURIComponent(imageUrl.slice(SUPABASE_LISTING_IMAGES_PREFIX.length));
    const { error } = await supabaseAdmin.storage.from("listing-images").remove([storagePath]);

    if (error && !isNotFoundMessage(error.message)) {
      throw error;
    }

    return;
  }

  const publicUrl = process.env.R2_PUBLIC_URL;
  if (publicUrl) {
    const normalizedPublicUrl = publicUrl.replace(/\/$/, "");
    let parsedPublicUrl: URL;

    try {
      parsedPublicUrl = new URL(normalizedPublicUrl);
    } catch {
      throw new Error("R2_PUBLIC_URL environment variable is not a valid URL");
    }

    const r2Prefix = `${normalizedPublicUrl}/`;
    if (parsedUrl.hostname === parsedPublicUrl.hostname) {
      if (!imageUrl.startsWith(r2Prefix)) {
        console.warn("deleteImageByUrl: unexpected R2 image URL shape", imageUrl);
        return;
      }

      const key = decodeURIComponent(imageUrl.slice(r2Prefix.length));

      try {
        await deleteFromR2(key);
      } catch (error) {
        if (error instanceof Error && isNotFoundMessage(error.message)) {
          return;
        }
        throw error;
      }

      return;
    }
  }

  console.warn("deleteImageByUrl: unsupported image host, skipping", imageUrl);
}