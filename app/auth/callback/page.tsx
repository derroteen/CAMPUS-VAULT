"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const nextPath = searchParams.get("next") || "/choose";

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        subscription.unsubscribe();
        router.replace(nextPath);
      }
    });

    // In case the session was already established before this listener
    // attached (detectSessionInUrl runs automatically on client init).
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        subscription.unsubscribe();
        router.replace(nextPath);
      }
    });

    const timeout = setTimeout(() => {
      subscription.unsubscribe();
      router.replace("/login?error=oauth_failed");
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-warm-bg px-6 text-charcoal">
      <p className="text-slate-600">Signing you in...</p>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-warm-bg px-6 text-charcoal">
          <p className="text-slate-600">Signing you in...</p>
        </main>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}