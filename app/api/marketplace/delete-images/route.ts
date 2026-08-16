import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { deleteImageByUrl } from "@/lib/image-storage";

export const runtime = "nodejs";
export const preferredRegion = "fra1";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const imageUrls = body?.imageUrls;

    if (!Array.isArray(imageUrls) || imageUrls.some((value) => typeof value !== "string")) {
      return NextResponse.json({ error: "imageUrls must be an array of strings" }, { status: 400 });
    }

    for (const imageUrl of imageUrls) {
      await deleteImageByUrl(imageUrl);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in marketplace delete-images route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}