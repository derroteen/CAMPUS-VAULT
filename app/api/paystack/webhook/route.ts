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

    // Verify signature
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

      const { error: updateError } = await supabaseAdmin
        .from("transactions")
        .update({
          status: "success",
          unlock_granted: true,
        })
        .eq("id", transaction.id)
        .select();
      console.log('Transaction update:', updateError ? `error: ${updateError.message}` : 'success');

      const unlockExpiresAt = new Date();
      unlockExpiresAt.setHours(unlockExpiresAt.getHours() + 7);

      const { error: profileUpdateError } = await supabaseAdmin
        .from("profiles")
        .update({
          unlock_expires_at: unlockExpiresAt.toISOString(),
        })
        .eq("id", transaction.profile_id)
        .select();
      console.log('Profile unlock update:', profileUpdateError ? `error: ${profileUpdateError.message}` : 'success');
    } else {
      console.log('Ignoring Paystack event:', event.event);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in Paystack webhook route:", error);
    return NextResponse.json({ success: true });
  }
}
