import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getPlanPrice, type ProPlanId } from "@/lib/pricing";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';

const PLAN_DURATIONS: Record<ProPlanId, number> = {
  week: 7,
  two_week: 14,
  month: 30,
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phoneNumber, plan } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: "Phone number is required" },
        { status: 400 }
      );
    }

    if (typeof plan !== "string" || !(plan in PLAN_DURATIONS)) {
      return NextResponse.json(
        { success: false, error: "Invalid plan selected" },
        { status: 400 }
      );
    }

    const planId = plan as ProPlanId;
    const selectedPlanDays = PLAN_DURATIONS[planId];
    const computedPrice = getPlanPrice(planId);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", user.id)
      .gte("created_at", oneMinuteAgo);

    if ((count ?? 0) >= 3) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many payment attempts. Please wait a minute before trying again.",
        },
        { status: 429 }
      );
    }

    let normalizedPhoneNumber = phoneNumber.trim();
    if (normalizedPhoneNumber.startsWith("0")) {
      normalizedPhoneNumber = "+254" + normalizedPhoneNumber.slice(1);
    } else if (normalizedPhoneNumber.startsWith("254")) {
      normalizedPhoneNumber = "+" + normalizedPhoneNumber;
    } else if (!normalizedPhoneNumber.startsWith("+254")) {
      return NextResponse.json(
        { success: false, error: "Invalid phone number format" },
        { status: 400 }
      );
    }

    const userEmail = user.email;
    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: "User email not found" },
        { status: 400 }
      );
    }

    const generatedReference = crypto.randomUUID();

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      throw new Error("PAYSTACK_SECRET_KEY environment variable not set");
    }

    const chargeResponse = await fetch("https://api.paystack.co/charge", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${secretKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: userEmail,
        amount: Math.round(computedPrice.amountKes * 100),
        currency: "KES",
        reference: generatedReference,
        mobile_money: {
          phone: normalizedPhoneNumber,
          provider: "mpesa"
        }
      })
    });

    const chargeData = await chargeResponse.json();
    console.log("Paystack subscribe chargeData:", chargeData);

    const chargeFailed =
      chargeData.status === false || chargeData.data?.status === "failed";

    const { error: insertError } = await supabaseAdmin
      .from("transactions")
      .insert({
        profile_id: user.id,
        phone_number: normalizedPhoneNumber,
        provider: "paystack",
        paystack_reference: generatedReference,
        amount_kes: computedPrice.amountKes,
        is_launch_offer: computedPrice.isLaunchOffer,
        purpose: "pro_subscription",
        plan_days: selectedPlanDays,
        status: chargeFailed ? "failed" : "pending",
      });
    if (insertError) {
      throw insertError;
    }

    if (chargeFailed) {
      return NextResponse.json(
        {
          success: false,
          error:
            chargeData.data?.gateway_response ||
            chargeData.message ||
            "Payment failed",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: chargeData.data
    });

  } catch (error) {
    console.error("Error in Paystack subscribe route:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}