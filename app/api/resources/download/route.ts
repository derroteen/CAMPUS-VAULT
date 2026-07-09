import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const preferredRegion = "fra1";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { resourceId } = body;

    if (!resourceId || typeof resourceId !== "string") {
      return NextResponse.json(
        { success: false, error: "Resource ID is required" },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
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
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("is_admin, unlock_expires_at")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: "Profile not found" },
        { status: 403 }
      );
    }

    const hasUnlockedAccess =
      profile.is_admin ||
      (profile.unlock_expires_at !== null &&
        new Date(profile.unlock_expires_at).getTime() > Date.now());

    if (!hasUnlockedAccess) {
      return NextResponse.json(
        { success: false, error: "Download access is locked" },
        { status: 403 }
      );
    }

    const { data: resource, error: resourceError } = await supabaseAdmin
      .from("resources")
      .select("id, storage_path, status, download_count")
      .eq("id", resourceId)
      .eq("status", "approved")
      .single();

    if (resourceError || !resource) {
      return NextResponse.json(
        { success: false, error: "Resource not found" },
        { status: 404 }
      );
    }

    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from("resources")
      .createSignedUrl(resource.storage_path, 60);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      return NextResponse.json(
        { success: false, error: "Could not create download link" },
        { status: 500 }
      );
    }

    await supabaseAdmin
      .from("resources")
      .update({ download_count: (resource.download_count ?? 0) + 1 })
      .eq("id", resource.id);

    return NextResponse.json({
      success: true,
      signedUrl: signedUrlData.signedUrl,
    });
  } catch (error) {
    console.error("Error in download route:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
