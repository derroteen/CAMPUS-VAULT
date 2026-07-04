"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      setEmail(session.user.email ?? null);
      setLoading(false);
    };

    getUser();
  }, [router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <p className="text-slate-300">Loading...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-white">
      <div className="w-full max-w-xl rounded-xl border border-slate-800 bg-slate-900 p-8 text-center shadow-xl">
        <h1 className="text-3xl font-semibold">Welcome, {email}</h1>
        <p className="mt-3 text-slate-400">
          You are signed in to Campus Vault.
        </p>
        <Link
          href="/browse"
          className="mt-6 inline-flex rounded-md bg-sky-600 px-4 py-2 font-medium text-white transition hover:bg-sky-500"
        >
          Browse resources
        </Link>
      </div>
    </main>
  );
}
