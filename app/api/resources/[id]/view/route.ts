import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const preferredRegion = "fra1";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const resourceId = params.id;

    if (!resourceId || typeof resourceId !== "string") {
      return NextResponse.json({ error: "Resource ID is required" }, { status: 400 });
    }

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

    const { data: resource, error: resourceError } = await supabaseAdmin
      .from("resources")
      .select("id, storage_path")
      .eq("id", resourceId)
      .eq("status", "approved")
      .single();

    if (resourceError || !resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from("resources")
      .createSignedUrl(resource.storage_path, 90);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      return NextResponse.json({ error: "Could not create view link" }, { status: 500 });
    }

    return NextResponse.json({ url: signedUrlData.signedUrl });
  } catch (error) {
    console.error("Error in view route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}