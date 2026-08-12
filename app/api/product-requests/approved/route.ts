import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("product_requests")
      .select("id, title, description")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ requests: data ?? [] });
  } catch (error) {
    console.error("Error fetching approved product requests:", error);
    return NextResponse.json({ requests: [] }, { status: 500 });
  }
}
