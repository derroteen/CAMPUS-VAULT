"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/Skeleton";

type University = {
  id: string;
  name: string;
};

type Resource = {
  id: string;
  title: string;
  unit_name: string;
  resource_type: string;
  status: "pending" | "approved" | "rejected";
  download_count: number;
};

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [featuredUniversities, setFeaturedUniversities] = useState<University[]>([]);
  const [approvedUploadsCount, setApprovedUploadsCount] = useState<number | null>(null);
  const [unlockExpiresAt, setUnlockExpiresAt] = useState<string | null>(null);
  const [myResources, setMyResources] = useState<Resource[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [totalDownloads, setTotalDownloads] = useState(0);

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
        .select("full_name, approved_uploads_count, unlock_expires_at")
        .eq("id", session.user.id)
        .single();

      if (!profileError && profileData) {
        setFullName(profileData.full_name ?? null);
        setApprovedUploadsCount(profileData.approved_uploads_count ?? 0);
        setUnlockExpiresAt(profileData.unlock_expires_at ?? null);
      }

      const { data: resourcesData, error: resourcesError } = await supabase
        .from("resources")
        .select("id, title, unit_name, resource_type, status, download_count")
        .eq("uploader_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (!resourcesError && resourcesData) {
        setMyResources(resourcesData);
      }

      const { count: truePendingCount, error: pendingCountError } = await supabase
        .from("resources")
        .select("id", { count: "exact", head: true })
        .eq("uploader_id", session.user.id)
        .eq("status", "pending");

      if (!pendingCountError && truePendingCount !== null) {
        setPendingCount(truePendingCount);
      }

      const { data: downloadsData, error: downloadsError } = await supabase
        .from("resources")
        .select("total_downloads:download_count.sum()")
        .eq("uploader_id", session.user.id)
        .eq("status", "approved");

      if (!downloadsError && downloadsData) {
        const total = downloadsData[0]?.total_downloads ?? 0;
        setTotalDownloads(total);
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
        .in("name", featuredNames)
        .eq("is_active", true);

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
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-left">
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
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-left">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">
          Unlock status
        </p>
        <p className="mt-2 text-lg font-medium text-white">
          {approvedUploadsCount ?? 0}/4 resources approved — upload {remainingUploads} more to unlock 7 hours of downloads
        </p>
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
      approved: "bg-green-500/20 text-green-300 border-green-500/30",
      rejected: "bg-red-500/20 text-red-300 border-red-500/30",
    };
    return (
      <span className={`text-xs px-2 py-1 rounded-full border ${colors[status as keyof typeof colors] || "bg-slate-500/20 text-slate-300 border-slate-500/30"}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-10 w-64 mb-3" />
          <Skeleton className="h-5 w-96" />

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1 space-y-4">
              <div className="grid gap-3">
                <Skeleton className="h-20 rounded-xl" />
                <Skeleton className="h-20 rounded-xl" />
                <Skeleton className="h-20 rounded-xl" />
              </div>
              <Skeleton className="h-24 rounded-xl" />
            </div>

            <div className="lg:col-span-2">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                <div className="flex items-center justify-between mb-4">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-5 w-24" />
                </div>
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-16 rounded-lg" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
            <Skeleton className="h-5 w-32 mb-3" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-semibold">
          Welcome, {fullName || email}
        </h1>
        <p className="mt-3 text-slate-400">
          You are signed in to Campus Vault.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-4">
            <div className="grid gap-3">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Approved uploads</p>
                <p className="mt-1 text-2xl font-semibold text-white">{approvedUploadsCount ?? 0}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Pending review</p>
                <p className="mt-1 text-2xl font-semibold text-white">{pendingCount}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total downloads</p>
                <p className="mt-1 text-2xl font-semibold text-white">{totalDownloads}</p>
              </div>
            </div>
            {getStatusCard()}
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">My uploads</h2>
                <Link
                  href="/upload"
                  className="text-sm text-sky-400 hover:text-sky-300"
                >
                  Upload new
                </Link>
              </div>

              {myResources.length > 0 ? (
                <div className="space-y-3">
                  {myResources.map((resource) => (
                    <div key={resource.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                      <div>
                        <p className="text-sm font-medium text-white">{resource.title}</p>
                        <p className="text-xs text-slate-400">{resource.unit_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-slate-700 text-slate-200">
                          {resource.resource_type}
                        </span>
                        {getStatusBadge(resource.status)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-400">You haven&apos;t uploaded any resources yet.</p>
                  <Link
                    href="/upload"
                    className="mt-3 inline-flex rounded-md bg-sky-600 px-4 py-2 font-medium text-white transition hover:bg-sky-500"
                  >
                    Upload your first resource
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
            Quick access
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

        <div className="mt-6 flex flex-wrap gap-3">
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
