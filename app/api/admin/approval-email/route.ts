import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendEmail } from "@/lib/email";
import { escapeHtml, renderEmailCard } from "@/lib/email-templates";

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

    // Only admins may trigger a decision email — checked server-side with
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

    const body = await request.json();
    const { type, id } = body;
    const decision = body.decision ?? "approved";
    const reason =
      typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";

    if (!id || (type !== "course_request" && type !== "resource")) {
      return NextResponse.json(
        { success: false, error: "Bad Request: type must be 'course_request' or 'resource', and id is required" },
        { status: 400 }
      );
    }

    if (decision !== "approved" && decision !== "rejected") {
      return NextResponse.json(
        { success: false, error: "Bad Request: decision must be 'approved' or 'rejected'" },
        { status: 400 }
      );
    }

    const approved = decision === "approved";
    const reasonHtml =
      !approved && reason
        ? `<p><strong>Reason:</strong> ${escapeHtml(reason)}</p>`
        : "";

    let recipientId: string;
    let subject: string;
    let heading: string;
    let bodyHtml: string;
    let ctaLabel: string;
    let ctaUrl: string;

    if (type === "course_request") {
      const { data: courseRequest, error: courseRequestError } = await supabaseAdmin
        .from("course_requests")
        .select("requested_name, requested_code, requested_by, status")
        .eq("id", id)
        .single();

      if (courseRequestError || !courseRequest) {
        return NextResponse.json(
          { success: false, error: "Course request not found" },
          { status: 404 }
        );
      }

      // Never email a decision the database doesn't actually reflect.
      if (courseRequest.status !== decision) {
        return NextResponse.json(
          { success: false, error: `Course request status is '${courseRequest.status}', not '${decision}'` },
          { status: 409 }
        );
      }

      const label = escapeHtml(`${courseRequest.requested_code} - ${courseRequest.requested_name}`);
      recipientId = courseRequest.requested_by;

      if (approved) {
        subject = "Your course request was approved";
        heading = "Your course request was approved";
        bodyHtml = `
          <p>Good news — the course you requested, <strong>${label}</strong>, has been added to MVCorner.</p>
          <p>You can now upload and browse resources for it.</p>
        `;
        ctaLabel = "Upload a resource";
        ctaUrl = `${SITE_URL}/upload`;
      } else {
        subject = "Your course request was not approved";
        heading = "Your course request was not approved";
        bodyHtml = `
          <p>We couldn't add the course you requested, <strong>${label}</strong>, to MVCorner this time.</p>
          ${reasonHtml}
          <p>If you think this is a mistake, get in touch and we'll take another look.</p>
        `;
        ctaLabel = "Contact support";
        ctaUrl = `${SITE_URL}/support`;
      }
    } else {
      const { data: resource, error: resourceError } = await supabaseAdmin
        .from("resources")
        .select("title, uploader_id, status")
        .eq("id", id)
        .single();

      if (resourceError || !resource) {
        return NextResponse.json(
          { success: false, error: "Resource not found" },
          { status: 404 }
        );
      }

      if (resource.status !== decision) {
        return NextResponse.json(
          { success: false, error: `Resource status is '${resource.status}', not '${decision}'` },
          { status: 409 }
        );
      }

      const title = escapeHtml(resource.title);
      recipientId = resource.uploader_id;

      if (approved) {
        subject = "Your upload was approved";
        heading = "Your upload was approved";
        bodyHtml = `
          <p>Your upload <strong>${title}</strong> has been approved and is now live on MVCorner.</p>
          <p>Thanks for contributing to the community.</p>
        `;
        ctaLabel = "View your uploads";
        ctaUrl = `${SITE_URL}/account`;
      } else {
        subject = "Your upload was not approved";
        heading = "Your upload was not approved";
        bodyHtml = `
          <p>Your upload <strong>${title}</strong> wasn't approved this time.</p>
          ${reasonHtml}
          <p>You're welcome to fix it and upload it again.</p>
        `;
        ctaLabel = "Upload again";
        ctaUrl = `${SITE_URL}/upload`;
      }
    }

    // Look the address up in Supabase Auth (the source of truth), falling
    // back to profiles.email if that column exists.
    let recipientEmail: string | null = null;
    const { data: authData } = await supabaseAdmin.auth.admin.getUserById(recipientId);
    recipientEmail = authData?.user?.email ?? null;

    if (!recipientEmail) {
      const { data: recipientProfile } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("id", recipientId)
        .maybeSingle();
      recipientEmail = recipientProfile?.email ?? null;
    }

    if (!recipientEmail) {
      return NextResponse.json(
        { success: false, error: "Recipient email not found" },
        { status: 404 }
      );
    }

    await sendEmail({
      to: recipientEmail,
      subject,
      htmlContent: renderEmailCard({ heading, bodyHtml, ctaLabel, ctaUrl }),
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to send decision email";
    console.error("Error in approval-email API route:", error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}