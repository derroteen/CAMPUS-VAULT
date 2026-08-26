import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendEmail } from "@/lib/email";
import { renderEmailCard } from "@/lib/email-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_URL = "https://www.mvcorner.co.ke";
const REMINDER_WINDOW_DAYS = 3;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

type SubscriptionRow = {
  id: string;
  user_id: string;
  expires_at: string;
  paystack_ref: string | null;
};

async function getEmailsByUserId(userIds: string[]) {
  if (userIds.length === 0) {
    return {} as Record<string, string>;
  }

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, email")
    .in("id", userIds);

  return Object.fromEntries((data ?? []).map((profile) => [profile.id, profile.email])) as Record<
    string,
    string
  >;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const reminderCutoff = new Date(now);
  reminderCutoff.setDate(reminderCutoff.getDate() + REMINDER_WINDOW_DAYS);

  const summary = {
    remindersSent: 0,
    expiredNoticesSent: 0,
    errors: [] as string[],
  };

  // --- Subscriptions expiring within the reminder window ---
  const { data: expiringSoon, error: expiringSoonError } = await supabaseAdmin
    .from("subscriptions")
    .select("id, user_id, expires_at, paystack_ref")
    .eq("tier", "pro")
    .eq("status", "active")
    .is("expiry_reminder_sent_at", null)
    .gt("expires_at", now.toISOString())
    .lte("expires_at", reminderCutoff.toISOString());

  if (expiringSoonError) {
    summary.errors.push(`Failed to query expiring subscriptions: ${expiringSoonError.message}`);
  } else {
    const rows = (expiringSoon ?? []) as SubscriptionRow[];
    const emailsByUser = await getEmailsByUserId(rows.map((row) => row.user_id));

    for (const row of rows) {
      const email = emailsByUser[row.user_id];
      if (!email) {
        summary.errors.push(`Subscription ${row.id}: no profile email found for user ${row.user_id}`);
        continue;
      }

      const expiresAt = new Date(row.expires_at);
      const daysLeft = Math.max(1, Math.ceil((expiresAt.getTime() - now.getTime()) / MS_PER_DAY));
      const isTrial = !row.paystack_ref;
      const dayWord = daysLeft === 1 ? "day" : "days";
      const expiryDate = expiresAt.toLocaleDateString("en-KE", { dateStyle: "long" });

      try {
        await sendEmail({
          to: email,
          subject: isTrial
            ? `Your MVCorner Pro trial ends in ${daysLeft} ${dayWord}`
            : `Your MVCorner Pro subscription expires in ${daysLeft} ${dayWord}`,
          htmlContent: renderEmailCard({
            heading: isTrial ? "Your free Pro trial is almost up" : "Your Pro subscription is expiring soon",
            bodyHtml: `
              <p>${
                isTrial
                  ? `Your 10-day free Pro trial ends in <strong>${daysLeft} ${dayWord}</strong>, on ${expiryDate}.`
                  : `Your Pro subscription expires in <strong>${daysLeft} ${dayWord}</strong>, on ${expiryDate}.`
              }</p>
              <p>After that, your listings lose Pro visibility and drop back to the standard 14-day listing window. Renew now to keep boosted visibility and the longer listing window.</p>
            `,
            ctaLabel: "Renew Pro",
            ctaUrl: `${SITE_URL}/marketplace/pro`,
          }),
        });

        await supabaseAdmin
          .from("subscriptions")
          .update({ expiry_reminder_sent_at: now.toISOString() })
          .eq("id", row.id);

        summary.remindersSent += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        summary.errors.push(`Subscription ${row.id}: failed to send reminder (${message})`);
      }
    }
  }

  // --- Subscriptions that have already expired ---
  const { data: justExpired, error: justExpiredError } = await supabaseAdmin
    .from("subscriptions")
    .select("id, user_id, expires_at, paystack_ref")
    .eq("tier", "pro")
    .eq("status", "active")
    .is("expired_notice_sent_at", null)
    .lt("expires_at", now.toISOString());

  if (justExpiredError) {
    summary.errors.push(`Failed to query expired subscriptions: ${justExpiredError.message}`);
  } else {
    const rows = (justExpired ?? []) as SubscriptionRow[];
    const emailsByUser = await getEmailsByUserId(rows.map((row) => row.user_id));

    for (const row of rows) {
      const email = emailsByUser[row.user_id];
      if (!email) {
        summary.errors.push(`Subscription ${row.id}: no profile email found for user ${row.user_id}`);
        continue;
      }

      const isTrial = !row.paystack_ref;

      try {
        await sendEmail({
          to: email,
          subject: isTrial ? "Your MVCorner Pro trial has ended" : "Your MVCorner Pro subscription has expired",
          htmlContent: renderEmailCard({
            heading: isTrial ? "Your free Pro trial has ended" : "Your Pro subscription has expired",
            bodyHtml: `
              <p>${
                isTrial ? "Your 10-day free Pro trial has ended." : "Your Pro subscription has expired."
              } Your listings are back on the standard 14-day window and have lost boosted visibility.</p>
              <p>You can pick Pro back up any time.</p>
            `,
            ctaLabel: "Reactivate Pro",
            ctaUrl: `${SITE_URL}/marketplace/pro`,
          }),
        });

        await supabaseAdmin
          .from("subscriptions")
          .update({ expired_notice_sent_at: now.toISOString() })
          .eq("id", row.id);

        summary.expiredNoticesSent += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        summary.errors.push(`Subscription ${row.id}: failed to send expired notice (${message})`);
      }
    }
  }

  console.log("subscription-reminders summary", summary);
  return NextResponse.json(summary, summary.errors.length > 0 ? { status: 207 } : undefined);
}
