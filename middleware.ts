import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const BYPASS_COOKIE_NAME = "maintenance_bypass";
const BYPASS_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/paystack/webhook")) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }),
    },
  });

  const { data: appSettings } = await supabase
    .from("app_settings")
    .select("maintenance_mode")
    .eq("id", true)
    .maybeSingle();

  if (!appSettings?.maintenance_mode) {
    return NextResponse.next();
  }

  const bypassSecret = process.env.MAINTENANCE_BYPASS_SECRET;
  const bypassCookie = request.cookies.get(BYPASS_COOKIE_NAME)?.value;

  if (bypassSecret && bypassCookie === bypassSecret) {
    return NextResponse.next();
  }

  if (pathname === "/maintenance") {
    return NextResponse.next();
  }

  const bypassQueryValue = request.nextUrl.searchParams.get("bypass");
  if (bypassSecret && bypassQueryValue === bypassSecret) {
    const cleanUrl = request.nextUrl.clone();
    cleanUrl.searchParams.delete("bypass");

    const response = NextResponse.redirect(cleanUrl);
    response.cookies.set({
      name: BYPASS_COOKIE_NAME,
      value: bypassSecret,
      maxAge: BYPASS_COOKIE_MAX_AGE_SECONDS,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return response;
  }

  const maintenanceUrl = request.nextUrl.clone();
  maintenanceUrl.pathname = "/maintenance";
  maintenanceUrl.search = "";

  return NextResponse.redirect(maintenanceUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$).*)",
  ],
};
