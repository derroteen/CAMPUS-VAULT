import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendEmail } from "@/lib/email";
import { renderEmailCard } from "@/lib/email-templates";

export const runtime = "nodejs";

const SITE_URL = "https://www.mvcorner.co.ke";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Missing Authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid session token" },
        { status: 401 }
      );
    }

    // Only admins may trigger an approval email — checked server-side with
    // the service role client rather than trusting the caller.
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!callerProfile?.is_admin) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Admins only" },
        { status: 403 }
      );
    }

    const { type, id } = await request.json();

    if (!id || (type !== "course_request" && type !== "resource")) {
      return NextResponse.json(
        { success: false, error: "Bad Request: type must be 'course_request' or 'resource', and id is required" },
        { status: 400 }
      );
    }

    let recipientId: string;
    let subject: string;
    let heading: string;
    let bodyHtml: string;
    let ctaLabel: string;
    let ctaUrl: string;

    if (type === "course_request") {
      const { data: courseRequest, error: courseRequestError } = await supabaseAdmin
        .from("course_requests")
        .select("requested_name, requested_code, requested_by")
        .eq("id", id)
        .single();

      if (courseRequestError || !courseRequest) {
        return NextResponse.json(
          { success: false, error: "Course request not found" },
          { status: 404 }
        );
      }

      recipientId = courseRequest.requested_by;
      subject = "Your course request was approved";
      heading = "Your course request was approved";
      bodyHtml = `
        <p>Good news — the course you requested, <strong>${courseRequest.requested_code} - ${courseRequest.requested_name}</strong>, has been added to MVCorner.</p>
        <p>You can now upload and browse resources for it.</p>
      `;
      ctaLabel = "Upload a resource";
      ctaUrl = `${SITE_URL}/upload`;
    } else {
      const { data: resource, error: resourceError } = await supabaseAdmin
        .from("resources")
        .select("title, uploader_id")
        .eq("id", id)
        .single();

      if (resourceError || !resource) {
        return NextResponse.json(
          { success: false, error: "Resource not found" },
          { status: 404 }
        );
      }

      recipientId = resource.uploader_id;
      subject = "Your upload was approved";
      heading = "Your upload was approved";
      bodyHtml = `
        <p>Your upload <strong>${resource.title}</strong> has been approved and is now live on MVCorner.</p>
        <p>Thanks for contributing to the community.</p>
      `;
      ctaLabel = "View your uploads";
      ctaUrl = `${SITE_URL}/account`;
    }

    const { data: recipientProfile, error: recipientError } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", recipientId)
      .single();

    if (recipientError || !recipientProfile?.email) {
      return NextResponse.json(
        { success: false, error: "Recipient email not found" },
        { status: 404 }
      );
    }

    await sendEmail({
      to: recipientProfile.email,
      subject,
      htmlContent: renderEmailCard({ heading, bodyHtml, ctaLabel, ctaUrl }),
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to send approval email";
    console.error("Error in approval-email API route:", error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
