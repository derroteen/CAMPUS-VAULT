"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type University = {
  id: string;
  name: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [featuredUniversities, setFeaturedUniversities] = useState<University[]>([]);
  const [approvedUploadsCount, setApprovedUploadsCount] = useState<number | null>(null);
  const [unlockExpiresAt, setUnlockExpiresAt] = useState<string | null>(null);

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

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("approved_uploads_count, unlock_expires_at")
        .eq("id", session.user.id)
        .single();

      if (!profileError && profileData) {
        setApprovedUploadsCount(profileData.approved_uploads_count ?? 0);
        setUnlockExpiresAt(profileData.unlock_expires_at ?? null);
      }

      const featuredNames = [
        "University of Nairobi",
        "Kenyatta University",
        "Moi University",
        "JKUAT",
        "Maseno University",
        "Strathmore University",
      ];

      const { data, error } = await supabase
        .from("universities")
        .select("id, name")
        .in("name", featuredNames);

      if (!error && data) {
        setFeaturedUniversities(data);
      }

      setLoading(false);
    };

    getUser();
  }, [router]);

  const getStatusCard = () => {
    const remainingUploads = Math.max(0, 4 - (approvedUploadsCount ?? 0));

    if (unlockExpiresAt && new Date(unlockExpiresAt).getTime() > Date.now()) {
      const diffMs = new Date(unlockExpiresAt).getTime() - Date.now();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      return (
        <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-left">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
            Unlocked
          </p>
          <p className="mt-2 text-lg font-medium text-white">
            {hours} hours {minutes} minutes remaining
          </p>
          <p className="mt-1 text-sm text-emerald-100/80">
            Your 7-hour download window is active.
          </p>
        </div>
      );
    }

    return (
      <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-left">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">
          Unlock status
        </p>
        <p className="mt-2 text-lg font-medium text-white">
          {approvedUploadsCount ?? 0}/4 resources approved — upload {remainingUploads} more to unlock 7 hours of downloads
        </p>
      </div>
    );
  };

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
        {getStatusCard()}
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
            Quick access
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {featuredUniversities.map((university) => (
              <Link
                key={university.id}
                href={`/browse?university=${university.id}`}
                className="rounded-lg border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-sky-500 hover:bg-slate-800"
              >
                {university.name}
              </Link>
            ))}
          </div>
          <p className="mt-3 text-sm text-slate-400">
            Don&apos;t see your university? Use the full list on the{' '}
            <Link href="/browse" className="text-sky-400 hover:text-sky-300">
              Browse page
            </Link>
            .
          </p>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/browse"
            className="inline-flex rounded-md bg-sky-600 px-4 py-2 font-medium text-white transition hover:bg-sky-500"
          >
            Browse resources
          </Link>
          <Link
            href="/upload"
            className="inline-flex rounded-md border border-slate-700 px-4 py-2 font-medium text-slate-200 transition hover:bg-slate-800"
          >
            Upload resource
          </Link>
        </div>
      </div>
    </main>
  );
}
