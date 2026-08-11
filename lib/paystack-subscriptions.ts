import { supabaseAdmin } from "@/lib/supabase-admin";

type SubscriptionTransaction = {
  id: string;
  profile_id: string;
  amount_kes: number | null;
  plan_days: number | null;
  is_launch_offer: boolean | null;
};

export async function activateProSubscriptionFromTransaction(
  transaction: SubscriptionTransaction,
  reference: string,
  now = new Date()
) {
  if (!transaction.plan_days) {
    return;
  }

  const { data: existingSub } = await supabaseAdmin
    .from("subscriptions")
    .select("id, expires_at")
    .eq("user_id", transaction.profile_id)
    .eq("tier", "pro")
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const currentExpiry = existingSub?.expires_at ? new Date(existingSub.expires_at) : null;
  const baseDate = currentExpiry && currentExpiry > now ? currentExpiry : now;

  const newExpiresAt = new Date(baseDate);
  newExpiresAt.setDate(newExpiresAt.getDate() + transaction.plan_days);

  const subscriptionPayload = {
    status: "active",
    expires_at: newExpiresAt.toISOString(),
    paystack_ref: reference,
    paid_amount: transaction.amount_kes,
    was_launch_offer: Boolean(transaction.is_launch_offer),
  };

  if (existingSub) {
    const { error: subUpdateError } = await supabaseAdmin
      .from("subscriptions")
      .update(subscriptionPayload)
      .eq("id", existingSub.id);

    if (subUpdateError) {
      throw subUpdateError;
    }

    return;
  }

  const { error: subInsertError } = await supabaseAdmin
    .from("subscriptions")
    .insert({
      user_id: transaction.profile_id,
      tier: "pro",
      status: "active",
      started_at: now.toISOString(),
      expires_at: newExpiresAt.toISOString(),
      paystack_ref: reference,
      paid_amount: transaction.amount_kes,
      was_launch_offer: Boolean(transaction.is_launch_offer),
    });

  if (subInsertError) {
    throw subInsertError;
  }
}