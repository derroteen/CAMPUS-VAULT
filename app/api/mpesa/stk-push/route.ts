import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createClient } from "@supabase/supabase-js";

async function fetchWithRetry(url: string, options: RequestInit, maxAttempts = 3): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      lastError = error;
      console.log(`Fetch attempt ${attempt} failed:`, error);
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
  }
  throw lastError;
}

// We use supabaseAdmin here to write the checkout_request_id to the transactions table
// because the regular supabase client (with RLS) might not allow inserting this sensitive
// field directly from user-facing requests. Using the service role client bypasses RLS
// safely for this server-side-only operation.

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phoneNumber } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: "Phone number is required" },
        { status: 400 }
      );
    }

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

    let normalizedPhoneNumber = phoneNumber.trim();
    if (normalizedPhoneNumber.startsWith("0")) {
      normalizedPhoneNumber = "254" + normalizedPhoneNumber.slice(1);
    } else if (normalizedPhoneNumber.startsWith("+254")) {
      normalizedPhoneNumber = normalizedPhoneNumber.slice(1);
    } else if (!normalizedPhoneNumber.startsWith("254")) {
      return NextResponse.json(
        { success: false, error: "Invalid phone number format" },
        { status: 400 }
      );
    }

    const consumerKey = process.env.DARAJA_CONSUMER_KEY ?? "";
    const consumerSecret = process.env.DARAJA_CONSUMER_SECRET ?? "";
    const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString(
      "base64"
    );

    const tokenResponse = await fetchWithRetry(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      }
    );
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      throw new Error("Failed to get access token");
    }

    const now = new Date();
    const timestamp =
      now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, "0") +
      now.getDate().toString().padStart(2, "0") +
      now.getHours().toString().padStart(2, "0") +
      now.getMinutes().toString().padStart(2, "0") +
      now.getSeconds().toString().padStart(2, "0");

    const shortcode = process.env.DARAJA_SHORTCODE ?? "";
    const passkey = process.env.DARAJA_PASSKEY ?? "";
    const password = Buffer.from(shortcode + passkey + timestamp).toString(
      "base64"
    );

    const callbackUrl = process.env.DARAJA_CALLBACK_URL ?? "";

    const stkPushResponse = await fetchWithRetry(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          BusinessShortCode: shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          Amount: 30,
          PartyA: normalizedPhoneNumber,
          PartyB: shortcode,
          PhoneNumber: normalizedPhoneNumber,
          CallBackURL: callbackUrl,
          AccountReference: "CampusVault",
          TransactionDesc: "Campus Vault 7-hour unlock",
        }),
      }
    );
    const stkPushData = await stkPushResponse.json();
    const checkoutRequestId = stkPushData.CheckoutRequestID;
    if (!checkoutRequestId) {
      throw new Error("Failed to initiate STK Push");
    }

    const { error: insertError } = await supabaseAdmin
      .from("transactions")
      .insert({
        profile_id: user.id,
        phone_number: normalizedPhoneNumber,
        checkout_request_id: checkoutRequestId,
        status: "pending",
      });
    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      checkoutRequestId,
    });
  } catch (error) {
    console.error("Error in STK Push route:", error);
    const isNetworkError = 
      (error instanceof TypeError && error.message.includes('fetch')) ||
      (error instanceof Error && (error.message.includes('socket') || error.message.includes('connection')));

    const errorMessage = isNetworkError
      ? "Safaricom appears to be temporarily unreachable, please try again"
      : "Internal server error";

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
