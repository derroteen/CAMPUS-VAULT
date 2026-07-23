import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

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

    const { type, title, userEmail } = await request.json();

    if (!type || !title || !userEmail) {
      return NextResponse.json(
        { success: false, error: "Bad Request: Missing required notification fields" },
        { status: 400 }
      );
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      console.error("ADMIN_EMAIL is not defined in environment variables");
      return NextResponse.json(
        { success: false, error: "Internal Server Error: Admin email not configured" },
        { status: 500 }
      );
    }

    let subject = "";
    let itemLabel = "";
    if (type === "course_request") {
      subject = "New course request pending approval";
      itemLabel = "Course Details";
    } else if (type === "upload") {
      subject = "New upload pending approval";
      itemLabel = "Upload Title";
    } else {
      return NextResponse.json(
        { success: false, error: "Bad Request: Invalid notification type" },
        { status: 400 }
      );
    }

    const dateSubmitted = new Date().toLocaleString("en-US", {
      timeZone: "UTC",
      dateStyle: "long",
      timeStyle: "short",
    }) + " UTC";

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff; color: #1a202c;">
        <h2 style="color: #0284c7; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">${subject}</h2>
        <p style="font-size: 16px; line-height: 1.5; color: #4a5568;">A new item requires your administrative approval.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px;">
          <tbody>
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #4a5568; border-bottom: 1px solid #edf2f7; width: 160px;">${itemLabel}:</td>
              <td style="padding: 10px 0; color: #1a202c; border-bottom: 1px solid #edf2f7;">${title}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #4a5568; border-bottom: 1px solid #edf2f7;">Submitting User:</td>
              <td style="padding: 10px 0; color: #1a202c; border-bottom: 1px solid #edf2f7;"><a href="mailto:${userEmail}" style="color: #0284c7; text-decoration: none;">${userEmail}</a></td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #4a5568; border-bottom: 1px solid #edf2f7;">Date Submitted:</td>
              <td style="padding: 10px 0; color: #1a202c; border-bottom: 1px solid #edf2f7;">${dateSubmitted}</td>
            </tr>
          </tbody>
        </table>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="font-size: 12px; color: #a0aec0; text-align: center; margin: 0;">This is an automated notification from Campus Vault.</p>
      </div>
    `;

    await sendEmail({
      to: adminEmail,
      subject,
      htmlContent,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to process notification";
    console.error("Error in notify API route:", error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
