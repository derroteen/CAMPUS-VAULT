import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { token?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Please submit a valid unsubscribe request." },
      { status: 400 }
    );
  }

  if (typeof body?.token !== "string" || !body.token) {
    return NextResponse.json(
      { success: false, error: "The unsubscribe link is missing or invalid." },
      { status: 400 }
    );
  }

  let userId: string | null;
  try {
    userId = verifyUnsubscribeToken(body.token);
  } catch (error) {
    console.error("Unable to verify unsubscribe link:", error);
    return NextResponse.json(
      { success: false, error: "We couldn't process this request right now. Please try again later." },
      { status: 500 }
    );
  }

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "The unsubscribe link is invalid. Please check the link and try again." },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update({ email_opt_out: true })
    .eq("id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Unable to update email preference:", error);
    return NextResponse.json(
      { success: false, error: "We couldn't update your email preference right now. Please try again later." },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { success: false, error: "We couldn't find the account for this unsubscribe link." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "You have been unsubscribed from reminder emails.",
  });
}
