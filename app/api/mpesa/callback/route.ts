import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// This callback route receives requests directly from Safaricom's servers — there is NO user session here!
// We MUST use supabaseAdmin (service role client) because:
// 1. There is no authenticated user making this request
// 2. We need to update the user's profile and transaction without a user session
// 3. Using the regular supabase client would fail due to missing auth and RLS policies

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { Body } = body;
    const { stkCallback } = Body;
    const { CheckoutRequestID, ResultCode, CallbackMetadata } = stkCallback;

    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("checkout_request_id", CheckoutRequestID)
      .single();
    if (transactionError || !transaction) {
      console.error("Transaction not found:", transactionError);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    if (ResultCode === 0) {
      const mpesaReceipt = CallbackMetadata?.Item?.find(
        (item: { Name: string; Value: string }) => item.Name === "MpesaReceiptNumber"
      )?.Value;

      await supabaseAdmin
        .from("transactions")
        .update({
          status: "success",
          mpesa_receipt: mpesaReceipt,
          unlock_granted: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.id);

      const unlockExpiresAt = new Date();
      unlockExpiresAt.setHours(unlockExpiresAt.getHours() + 7);

      await supabaseAdmin
        .from("profiles")
        .update({
          unlock_expires_at: unlockExpiresAt.toISOString(),
        })
        .eq("id", transaction.profile_id);
    } else {
      await supabaseAdmin
        .from("transactions")
        .update({
          status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.id);
    }
  } catch (error) {
    console.error("Error in callback route:", error);
  }

  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
