import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { activateProSubscriptionFromTransaction } from "@/lib/paystack-subscriptions";

export const runtime = "nodejs";
export const preferredRegion = "fra1";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const reference = url.searchParams.get("reference");

    if (!reference) {
      return NextResponse.json({ error: "Reference is required" }, { status: 400 });
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from("transactions")
      .select("id, profile_id, status, purpose, plan_days, amount_kes, is_launch_offer, paystack_reference")
      .eq("paystack_reference", reference)
      .eq("profile_id", user.id)
      .maybeSingle();

    console.log("Verify: local transaction status:", transaction?.status, "id:", transaction?.id);

    if (transactionError || !transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: "PAYSTACK_SECRET_KEY not set" }, { status: 500 });
    }

    const verificationResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      }
    );

    const verificationData = await verificationResponse.json();

    console.log(
      "Verify: Paystack remote status:",
      verificationData?.data?.status,
      "full response:",
      JSON.stringify(verificationData)
    );

    if (verificationData?.data?.status === "success" && transaction.status === "pending") {
      const { data: successUpdatedRows, error: successUpdateError } = await supabaseAdmin
        .from("transactions")
        .update({ status: "success" })
        .eq("id", transaction.id)
        .eq("status", "pending")
        .select();

      if (successUpdateError) {
        throw successUpdateError;
      }

      if (!successUpdatedRows || successUpdatedRows.length === 0) {
        const { data: latestTransaction } = await supabaseAdmin
          .from("transactions")
          .select("status")
          .eq("id", transaction.id)
          .maybeSingle();

        return NextResponse.json({ status: latestTransaction?.status ?? transaction.status });
      }

      if (transaction.purpose === "pro_subscription") {
        await activateProSubscriptionFromTransaction(transaction, reference);
      }

      return NextResponse.json({ status: "success" });
    }

    if (
      (verificationData?.data?.status === "failed" || verificationData?.data?.status === "abandoned") &&
      transaction.status === "pending"
    ) {
      const { data: failedUpdatedRows, error: failedUpdateError } = await supabaseAdmin
        .from("transactions")
        .update({ status: "failed" })
        .eq("id", transaction.id)
        .eq("status", "pending")
        .select();

      if (failedUpdateError) {
        throw failedUpdateError;
      }

      if (!failedUpdatedRows || failedUpdatedRows.length === 0) {
        const { data: latestTransaction } = await supabaseAdmin
          .from("transactions")
          .select("status")
          .eq("id", transaction.id)
          .maybeSingle();

        return NextResponse.json({ status: latestTransaction?.status ?? transaction.status });
      }

      return NextResponse.json({ status: "failed" });
    }

    console.log("Verify: falling through to final return with local status:", transaction.status);
    return NextResponse.json({ status: transaction.status });
  } catch (error) {
    console.error("Error in Paystack verify route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}