import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";
import { escapeHtml, renderEmailCard } from "@/lib/email-templates";
import { SUPPORT_EMAIL } from "@/lib/site-config";

export const runtime = "nodejs";

// In-memory rate limiting map (note: this is a soft limit on serverless platforms due to ephemeral function instances)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 5;

const VALID_CATEGORIES = [
  "Account & login",
  "Upload or course request",
  "Payment or subscription",
  "Marketplace listing",
  "Report a bug",
  "Something else",
] as const;

type ValidCategory = (typeof VALID_CATEGORIES)[number];

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "unknown-ip";
}

function generateTicketRef(): string {
  // 6 chars from A-Z (minus I, O) and 2-9
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return `MVC-${code}`;
}

export async function POST(request: Request) {
  let body: {
    name?: unknown;
    email?: unknown;
    category?: unknown;
    message?: unknown;
    website?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request payload." },
      { status: 400 }
    );
  }

  const { name, email, category, message, website } = body ?? {};

  // Honeypot check: if filled, return success with a fake ticketRef and do nothing else
  if (typeof website === "string" && website.trim().length > 0) {
    return NextResponse.json({
      success: true,
      ticketRef: generateTicketRef(),
    });
  }

  // Rate limiting (5 requests per IP per hour)
  const ip = getClientIp(request);
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (record && now < record.resetTime) {
    if (record.count >= MAX_REQUESTS_PER_WINDOW) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many support requests submitted. Please wait a while or email us directly.",
        },
        { status: 400 }
      );
    }
    record.count += 1;
  } else {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
  }

  // Input validation
  const trimmedName = typeof name === "string" ? name.trim() : "";
  if (!trimmedName || trimmedName.length > 100) {
    return NextResponse.json(
      {
        success: false,
        error: "Please provide a valid name (up to 100 characters).",
      },
      { status: 400 }
    );
  }

  const trimmedEmail = typeof email === "string" ? email.trim() : "";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
    return NextResponse.json(
      {
        success: false,
        error: "Please provide a valid email address.",
      },
      { status: 400 }
    );
  }

  if (
    typeof category !== "string" ||
    !VALID_CATEGORIES.includes(category as ValidCategory)
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Please select a valid topic category.",
      },
      { status: 400 }
    );
  }

  const trimmedMessage = typeof message === "string" ? message.trim() : "";
  if (trimmedMessage.length < 10 || trimmedMessage.length > 2000) {
    return NextResponse.json(
      {
        success: false,
        error: "Message must be between 10 and 2,000 characters.",
      },
      { status: 400 }
    );
  }

  // Optional: Resolve user account via Authorization Bearer token
  let accountEmail: string | null = null;
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.substring(7).trim();
    if (token) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (supabaseUrl && supabaseAnonKey) {
          const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          });
          const {
            data: { user },
          } = await supabase.auth.getUser(token);
          if (user?.email) {
            accountEmail = user.email;
          }
        }
      } catch (authError) {
        console.warn("Could not resolve account from bearer token:", authError);
      }
    }
  }

  const ticketRef = generateTicketRef();

  // Escape all user text for safe HTML rendering
  const escapedName = escapeHtml(trimmedName);
  const escapedEmail = escapeHtml(trimmedEmail);
  const escapedCategory = escapeHtml(category);
  const escapedMessage = escapeHtml(trimmedMessage).replace(/\n/g, "<br />");
  const escapedAccountEmail = accountEmail ? escapeHtml(accountEmail) : null;

  // Send 1: To SUPPORT_EMAIL
  const supportEmailHtml = `
    <p style="margin: 0 0 16px;">A new support request has been submitted from the MVCorner support form.</p>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold; width: 140px; color: #4a5568;">Ticket Reference:</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-weight: bold; color: #2556E8;">${ticketRef}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #4a5568;">Name:</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${escapedName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #4a5568;">Contact Email:</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;"><a href="mailto:${escapedEmail}">${escapedEmail}</a></td>
      </tr>
      ${
        escapedAccountEmail
          ? `<tr>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #4a5568;">Account Email:</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${escapedAccountEmail}</td>
            </tr>`
          : ""
      }
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #4a5568;">Category:</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${escapedCategory}</td>
      </tr>
    </table>
    <div style="margin-top: 16px;">
      <p style="font-weight: bold; margin: 0 0 8px; color: #4a5568;">Message:</p>
      <div style="background-color: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; font-size: 14px; line-height: 1.6; color: #2d3748;">
        ${escapedMessage}
      </div>
    </div>
  `;

  try {
    await sendEmail({
      to: SUPPORT_EMAIL,
      subject: `[${ticketRef}] ${category} - ${trimmedName}`,
      replyTo: { email: trimmedEmail, name: trimmedName },
      htmlContent: renderEmailCard({
        heading: `Support Request [${ticketRef}]`,
        bodyHtml: supportEmailHtml,
      }),
    });
  } catch (error) {
    console.error("Failed to send support email:", error);
    return NextResponse.json(
      {
        success: false,
        error: `Failed to send support request. Please email us directly at ${SUPPORT_EMAIL}.`,
      },
      { status: 500 }
    );
  }

  // Send 2: Receipt to user (non-blocking failure)
  const receiptEmailHtml = `
    <p style="margin: 0 0 16px;">Hi ${escapedName},</p>
    <p style="margin: 0 0 16px;">Thank you for contacting MVCorner support. We have received your request regarding <strong>${escapedCategory}</strong>.</p>
    <div style="background-color: #f7fafc; border-left: 4px solid #2556E8; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #4a5568;">Ticket Reference: <strong style="font-family: monospace; color: #2556E8;">${ticketRef}</strong></p>
    </div>
    <p style="margin: 0 0 16px;">Our team is reviewing your ticket and will respond to this email address shortly.</p>
    <p style="margin: 0;">If you need to add more details or have screenshots, reply directly to this email or reach us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
  `;

  try {
    await sendEmail({
      to: trimmedEmail,
      subject: `[${ticketRef}] Support request received - MVCorner`,
      replyTo: { email: SUPPORT_EMAIL, name: "MVCorner Support" },
      htmlContent: renderEmailCard({
        heading: "We've Received Your Support Request",
        bodyHtml: receiptEmailHtml,
      }),
    });
  } catch (receiptError) {
    console.error("Failed to send support receipt email to user:", receiptError);
  }

  return NextResponse.json({ success: true, ticketRef });
}
