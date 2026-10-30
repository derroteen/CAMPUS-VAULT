import { NextRequest, NextResponse } from "next/server";
import { buildUnsubscribeUrl } from "@/lib/unsubscribe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendEmail } from "@/lib/email";
import { escapeHtml, renderEmailCard } from "@/lib/email-templates";
import { SITE_URL } from "@/lib/site-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_EMAILS_PER_RUN = 10;
const MAX_AUTH_LOOKUPS_PER_RUN = 200;
const PAGE_SIZE = 100;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

type ListingRow = {
  id: string;
  seller_id: string;
  title: string;
  expires_at: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
  email_opt_out: boolean;
  last_reengagement_email_at: string | null;
};

type Candidate = {
  type: "listing_expiring" | "inactive";
  email: string;
  listingCount: number;
};

type Summary = {
  listingRemindersSent: number;
  inactiveRemindersSent: number;
  emailsSent: number;
  authLookups: number;
  errors: string[];
};

function isWithinCooldown(timestamp: string | null, cutoff: number) {
  if (!timestamp) {
    return false;
  }

  const sentAt = Date.parse(timestamp);
  return !Number.isFinite(sentAt) || sentAt >= cutoff;
}

function maskEmail(email: string) {
  const separator = email.lastIndexOf("@");
  if (separator <= 0 || separator === email.length - 1) {
    return "***";
  }

  return `${email.slice(0, Math.min(2, separator))}***${email.slice(separator)}`;
}

async function updateLastEmailAt(userId: string, timestamp: string, summary: Summary) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update({ last_reengagement_email_at: timestamp })
    .eq("id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    summary.errors.push(`User ${userId}: failed to update re-engagement timestamp (${error.message})`);
  } else if (!data) {
    summary.errors.push(`User ${userId}: profile not found while updating re-engagement timestamp`);
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const testEmail = request.nextUrl.searchParams.get("testEmail");
  if (testEmail !== null) {
    const exactEmailPattern = testEmail.replace(/[\\%_]/g, "\\$&");
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("email", exactEmailPattern)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }
    if (!profile) {
      return NextResponse.json({ error: "No profile with that email" }, { status: 404 });
    }

    try {
      await sendEmail({
        to: testEmail,
        subject: "[TEST] New study resources are up on MVCorner",
        htmlContent: renderEmailCard({
          heading: "New study resources are up",
          bodyHtml: "<p>There are new study resources waiting for you on MVCorner. Come back and see what's available.</p>",
          ctaLabel: "Browse resources",
          ctaUrl: `${SITE_URL}/browse`,
          unsubscribeUrl: buildUnsubscribeUrl(profile.id),
        }),
      });

      return NextResponse.json({ testSent: true, to: maskEmail(testEmail) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const dryRun = request.nextUrl.searchParams.get("dryRun") === "1";
  const now = new Date();
  const timestamp = now.toISOString();
  const twoDaysFromNow = new Date(now.getTime() + 2 * MS_PER_DAY).toISOString();
  const sevenDaysAgo = now.getTime() - 7 * MS_PER_DAY;
  const thirtyDaysAgo = now.getTime() - 30 * MS_PER_DAY;
  const fourteenDaysAgo = now.getTime() - 14 * MS_PER_DAY;
  const sixtyDaysAgo = now.getTime() - 60 * MS_PER_DAY;
  const summary: Summary = {
    listingRemindersSent: 0,
    inactiveRemindersSent: 0,
    emailsSent: 0,
    authLookups: 0,
    errors: [],
  };
  const candidates: Candidate[] = [];
  const processedSellers = new Set<string>();
  const emailedUsers = new Set<string>();
  const listingsBySeller = new Map<string, ListingRow[]>();

  let listingOffset = 0;
  while (true) {
    const { data, error } = await supabaseAdmin
      .from("listings")
      .select("id, seller_id, title, expires_at")
      .eq("status", "active")
      .gt("expires_at", timestamp)
      .lte("expires_at", twoDaysFromNow)
      .order("expires_at", { ascending: true })
      .range(listingOffset, listingOffset + PAGE_SIZE - 1);

    if (error) {
      summary.errors.push(`Failed to query expiring listings: ${error.message}`);
      break;
    }

    const listings = (data ?? []) as ListingRow[];
    for (const listing of listings) {
      const sellerListings = listingsBySeller.get(listing.seller_id) ?? [];
      sellerListings.push(listing);
      listingsBySeller.set(listing.seller_id, sellerListings);
    }

    if (listings.length < PAGE_SIZE) {
      break;
    }
    listingOffset += listings.length;
  }

  const sellerIds = Array.from(listingsBySeller.keys());
  for (let offset = 0; offset < sellerIds.length; offset += PAGE_SIZE) {
    if (summary.emailsSent >= MAX_EMAILS_PER_RUN || candidates.length >= MAX_EMAILS_PER_RUN) {
      break;
    }

    const sellerBatch = sellerIds.slice(offset, offset + PAGE_SIZE);
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, email_opt_out, last_reengagement_email_at")
      .in("id", sellerBatch);

    if (profilesError) {
      summary.errors.push(`Failed to query listing sellers' email preferences: ${profilesError.message}`);
      sellerBatch.forEach((id) => processedSellers.add(id));
      continue;
    }

    const profilesById = new Map(
      ((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile])
    );

    for (const sellerId of sellerBatch) {
      processedSellers.add(sellerId);
      if (summary.emailsSent >= MAX_EMAILS_PER_RUN || candidates.length >= MAX_EMAILS_PER_RUN) {
        break;
      }

      const profile = profilesById.get(sellerId);
      if (!profile) {
        summary.errors.push(`Listing seller ${sellerId}: no profile found`);
        continue;
      }
      if (profile.email_opt_out || isWithinCooldown(profile.last_reengagement_email_at, sevenDaysAgo)) {
        continue;
      }
      if (!profile.email) {
        summary.errors.push(`Listing seller ${sellerId}: no profile email found`);
        continue;
      }

      const listings = listingsBySeller.get(sellerId) ?? [];
      if (dryRun) {
        candidates.push({
          type: "listing_expiring",
          email: maskEmail(profile.email),
          listingCount: listings.length,
        });
        emailedUsers.add(profile.id);
        continue;
      }

      const visibleListings = listings.slice(0, 5);
      const additionalCount = listings.length - visibleListings.length;
      const listingItems = visibleListings
        .map(
          (listing) =>
            `<li><strong>${escapeHtml(listing.title)}</strong> — expires ${new Date(
              listing.expires_at
            ).toLocaleDateString("en-KE", { dateStyle: "long" })}</li>`
        )
        .join("");
      const moreListings =
        additionalCount > 0 ? `<li>and ${additionalCount} more</li>` : "";

      try {
        await sendEmail({
          to: profile.email,
          subject: "Your MVCorner listings are expiring soon",
          htmlContent: renderEmailCard({
            heading: "Your listings are expiring soon",
            bodyHtml: `
              <p>These active listings are set to expire within 2 days:</p>
              <ul>${listingItems}${moreListings}</ul>
              <p>Visit your listings if you would like to review them before they expire.</p>
            `,
               ctaLabel: "View my listings",
   ctaUrl: `${SITE_URL}/marketplace/my-listings`,
            unsubscribeUrl: buildUnsubscribeUrl(profile.id),
          }),
        });

        summary.listingRemindersSent += 1;
        summary.emailsSent += 1;
        emailedUsers.add(profile.id);
        await updateLastEmailAt(profile.id, timestamp, summary);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        summary.errors.push(`Seller ${sellerId}: failed to send listing reminder (${message})`);
      }
    }
  }

  let profileOffset = 0;
  while (
    summary.emailsSent < MAX_EMAILS_PER_RUN &&
    candidates.length < MAX_EMAILS_PER_RUN &&
    summary.authLookups < MAX_AUTH_LOOKUPS_PER_RUN
  ) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, email, email_opt_out, last_reengagement_email_at")
      .eq("email_opt_out", false)
      .order("id", { ascending: true })
      .range(profileOffset, profileOffset + PAGE_SIZE - 1);

    if (error) {
      summary.errors.push(`Failed to query inactive users: ${error.message}`);
      break;
    }

    const profiles = (data ?? []) as ProfileRow[];
    if (profiles.length === 0) {
      break;
    }
    profileOffset += profiles.length;

    for (const profile of profiles) {
      if (
        summary.emailsSent >= MAX_EMAILS_PER_RUN ||
        candidates.length >= MAX_EMAILS_PER_RUN ||
        summary.authLookups >= MAX_AUTH_LOOKUPS_PER_RUN
      ) {
        break;
      }
      if (
        emailedUsers.has(profile.id) ||
        isWithinCooldown(profile.last_reengagement_email_at, thirtyDaysAgo)
      ) {
        continue;
      }
      if (!profile.email) {
        summary.errors.push(`User ${profile.id}: no profile email found`);
        continue;
      }

      summary.authLookups += 1;
      const { data: authData, error: authError } =
        await supabaseAdmin.auth.admin.getUserById(profile.id);
      if (authError) {
        summary.errors.push(`User ${profile.id}: failed to fetch sign-in activity (${authError.message})`);
        continue;
      }

      const lastSignInAt = authData.user?.last_sign_in_at;
      if (!lastSignInAt) {
        continue;
      }

      const lastSignInTime = Date.parse(lastSignInAt);
      if (!Number.isFinite(lastSignInTime)) {
        summary.errors.push(`User ${profile.id}: invalid last sign-in timestamp`);
        continue;
      }
      if (lastSignInTime > fourteenDaysAgo || lastSignInTime < sixtyDaysAgo) {
        continue;
      }

      if (dryRun) {
        candidates.push({
          type: "inactive",
          email: maskEmail(profile.email),
          listingCount: 0,
        });
        emailedUsers.add(profile.id);
        continue;
      }

      try {
        await sendEmail({
          to: profile.email,
          subject: "New study resources are up on MVCorner",
          htmlContent: renderEmailCard({
            heading: "New study resources are up",
            bodyHtml: "<p>There are new study resources waiting for you on MVCorner. Come back and see what's available.</p>",
            ctaLabel: "Browse resources",
            ctaUrl: `${SITE_URL}/browse`,
            unsubscribeUrl: buildUnsubscribeUrl(profile.id),
          }),
        });

        summary.inactiveRemindersSent += 1;
        summary.emailsSent += 1;
        emailedUsers.add(profile.id);
        await updateLastEmailAt(profile.id, timestamp, summary);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        summary.errors.push(`User ${profile.id}: failed to send re-engagement email (${message})`);
      }
    }

    if (
      profiles.length < PAGE_SIZE ||
      summary.emailsSent >= MAX_EMAILS_PER_RUN ||
      candidates.length >= MAX_EMAILS_PER_RUN ||
      summary.authLookups >= MAX_AUTH_LOOKUPS_PER_RUN
    ) {
      break;
    }
  }

  if (dryRun) {
    return NextResponse.json(
      candidates.map(({ type, email, listingCount }) => ({
        type,
        email,
        listingCount,
      }))
    );
  }

  console.log("reengagement summary", summary);
  return NextResponse.json(summary, summary.errors.length > 0 ? { status: 207 } : undefined);
}
