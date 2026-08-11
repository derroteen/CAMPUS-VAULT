import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { activateProSubscriptionFromTransaction } from "@/lib/paystack-subscriptions";
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
    const hashBuffer = Buffer.from(hash, 'utf8');
    const signatureBuffer = Buffer.from(signature ?? '', 'utf8');
    const signatureValid =
      hashBuffer.length === signatureBuffer.length &&
      crypto.timingSafeEqual(hashBuffer, signatureBuffer);

    if (!signatureValid) {
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

      const { data: updatedRows, error: updateError } = await supabaseAdmin
        .from("transactions")
        .update({
          status: "success",
        })
        .eq("id", transaction.id)
        .eq("status", "pending")
        .select();
      console.log('Transaction update:', updateError ? `error: ${updateError.message}` : 'success');

      if (updateError) {
        throw updateError;
      }

      if (!updatedRows || updatedRows.length === 0) {
        console.log("Transaction status already changed by another caller; skipping activation.");
        return NextResponse.json({ success: true });
      }

      if (transaction.purpose === "pro_subscription") {
        console.log('Processing Pro subscription grant, plan_days:', transaction.plan_days);
        await activateProSubscriptionFromTransaction(transaction, reference);
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