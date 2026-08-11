import { Wrench } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const FALLBACK_MESSAGE =
  "We're making some quick improvements and will be back shortly. Thanks for your patience.";

export const dynamic = "force-dynamic";

async function getMaintenanceMessage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return FALLBACK_MESSAGE;
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
    .select("maintenance_message")
    .eq("id", true)
    .maybeSingle();

  return appSettings?.maintenance_message ?? FALLBACK_MESSAGE;
}

export default async function MaintenancePage() {
  const maintenanceMessage = await getMaintenanceMessage();

  return (
    <main className="min-h-screen bg-warm-bg px-4 py-10 text-charcoal sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[80vh] w-full max-w-3xl items-center justify-center">
        <section className="w-full rounded-3xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-coral bg-white/90 p-8 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-sunflower/35 bg-sunflower/15 text-forest">
            <Wrench className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">We&apos;ll be right back</h1>
          <p className="mt-4 text-base leading-7 text-charcoal/70 sm:text-lg">{maintenanceMessage}</p>
        </section>
      </div>
    </main>
  );
}
