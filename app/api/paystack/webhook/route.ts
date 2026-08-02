import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import crypto from "crypto";

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';

export async function POST(request: Request) {
  try {
    console.log('Paystack webhook received');
    const rawBody = await request.text();
    const signature = request.headers.get('x-paystack-signature');
    const secret = process.env.PAYSTACK_SECRET_KEY;

    if (!secret) {
      console.error('PAYSTACK_SECRET_KEY environment variable not set');
      return NextResponse.json({ success: false }, { status: 500 });
    }

    const hash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
    if (hash !== signature) {
      console.log('Paystack webhook signature verification failed');
      return NextResponse.json({ success: false }, { status: 401 });
    }
    console.log('Paystack webhook signature verified');

    const event = JSON.parse(rawBody);
    console.log('Paystack webhook event type:', event.event);

    if (event.event === 'charge.success') {
      const reference = event.data.reference;
      console.log('Looking up transaction with paystack_reference:', reference);

      const { data: transaction, error: transactionError } = await supabaseAdmin
        .from("transactions")
        .select("*")
        .eq("paystack_reference", reference)
        .single();
      console.log('Transaction lookup:', transaction ? `found (status: ${transaction.status})` : 'not found', transactionError ? `error: ${transactionError.message}` : '');

      if (transactionError || !transaction) {
        console.error('Transaction not found:', transactionError);
        return NextResponse.json({ success: true });
      }

      // Avoid double-processing if the webhook fires more than once for the
      // same reference (Paystack can retry webhook delivery).
      if (transaction.status === "success") {
        console.log('Transaction already processed, skipping.');
        return NextResponse.json({ success: true });
      }

      const { error: updateError } = await supabaseAdmin
        .from("transactions")
        .update({
          status: "success",
        })
        .eq("id", transaction.id)
        .select();
      console.log('Transaction update:', updateError ? `error: ${updateError.message}` : 'success');

      if (transaction.purpose === "pro_subscription" && transaction.plan_days) {
        console.log('Processing Pro subscription grant, plan_days:', transaction.plan_days);

        const { data: existingSub } = await supabaseAdmin
          .from("subscriptions")
          .select("id, expires_at")
          .eq("user_id", transaction.profile_id)
          .eq("tier", "pro")
          .order("expires_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const now = new Date();
        const currentExpiry = existingSub?.expires_at ? new Date(existingSub.expires_at) : null;
        const baseDate = currentExpiry && currentExpiry > now ? currentExpiry : now;

        const newExpiresAt = new Date(baseDate);
        newExpiresAt.setDate(newExpiresAt.getDate() + transaction.plan_days);

        if (existingSub) {
          const { error: subUpdateError } = await supabaseAdmin
            .from("subscriptions")
            .update({
              status: "active",
              expires_at: newExpiresAt.toISOString(),
              paystack_ref: reference,
            })
            .eq("id", existingSub.id);
          console.log('Subscription extend:', subUpdateError ? `error: ${subUpdateError.message}` : `success, new expiry: ${newExpiresAt.toISOString()}`);
       } else {
          const { error: subInsertError } = await supabaseAdmin
            .from("subscriptions")
            .insert({
              user_id: transaction.profile_id,
              tier: "pro",
              status: "active",
              started_at: now.toISOString(),
              expires_at: newExpiresAt.toISOString(),
              paystack_ref: reference,
            });
          console.log('Subscription create:', subInsertError ? `error: ${subInsertError.message}` : `success, expiry: ${newExpiresAt.toISOString()}`);
        }
      }
    } else {
      console.log('Ignoring Paystack event:', event.event);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in Paystack webhook route:", error);
    return NextResponse.json({ success: true });
  }
}