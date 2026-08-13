"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { userMustEnrollAdminMfa } from "@/lib/auth-mfa";
import { supabase } from "@/lib/supabase";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const nextPath = searchParams.get("next") || "/choose";
    let redirected = false;

    const resolveDestination = async (userId: string) => {
      const mustEnrollMfa = await userMustEnrollAdminMfa(userId);
      return mustEnrollMfa ? "/account?mfa_required=1" : nextPath;
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session || redirected) {
        return;
      }

      redirected = true;
      subscription.unsubscribe();
      resolveDestination(session.user.id).then((destination) => {
        router.replace(destination);
      });
    });

    // In case the session was already established before this listener
    // attached (detectSessionInUrl runs automatically on client init).
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session || redirected) {
        return;
      }

      redirected = true;
      subscription.unsubscribe();
      resolveDestination(data.session.user.id).then((destination) => {
        router.replace(destination);
      });
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