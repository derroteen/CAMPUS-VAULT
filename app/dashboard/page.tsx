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
        <div className="rounded-xl border-r-[0.5px] border-y-[0.5px] border-r-leaf/20 border-y-leaf/20 border-l-4 border-l-leaf bg-white/90 p-4 text-left shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-leaf">
            Unlocked
          </p>
          <p className="mt-2 text-lg font-medium text-charcoal">
            {hours} hours {minutes} minutes remaining
          </p>
          <p className="mt-1 text-sm text-charcoal/70">
            Your 7-hour download window is active.
          </p>
        </div>
      );
    }

    return (
      <div className="rounded-xl border-r-[0.5px] border-y-[0.5px] border-r-sunflower/25 border-y-sunflower/25 border-l-4 border-l-sunflower bg-white/90 p-4 text-left shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-charcoal/70">
          Unlock status
        </p>
        <p className="mt-2 text-lg font-medium text-charcoal">
          {approvedUploadsCount ?? 0}/4 resources approved — upload {remainingUploads} more to unlock 7 hours of downloads
        </p>
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: "bg-sunflower/20 text-charcoal border-sunflower/40",
      approved: "bg-leaf/15 text-forest border-leaf/30",
      rejected: "bg-coral/15 text-coral border-coral/30",
    };
    return (
      <span className={`text-xs px-2 py-1 rounded-full border ${colors[status as keyof typeof colors] || "bg-white/80 text-charcoal/70 border-forest/15"}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-warm-bg px-6 py-12 text-charcoal">
        <div className="mx-auto max-w-6xl">
          <Skeleton className="mb-3 h-10 w-64" />
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
              <div className="rounded-xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-forest bg-white/90 p-6 shadow-sm">
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

          <div className="mt-6 rounded-xl border-r-[0.5px] border-y-[0.5px] border-r-coral/20 border-y-coral/20 border-l-4 border-l-coral bg-white/90 p-6 shadow-sm">
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
    <main className="min-h-screen bg-warm-bg px-6 py-12 text-charcoal">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-semibold">
          Welcome, {fullName || email}
        </h1>
        <p className="mt-3 text-charcoal/70">
          You are signed in to MVCorner.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-4">
            <div className="grid gap-3">
              <div className="rounded-xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-forest bg-white/90 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-charcoal/60">Approved uploads</p>
                <p className="mt-1 text-2xl font-semibold text-charcoal">{approvedUploadsCount ?? 0}</p>
              </div>
              <div className="rounded-xl border-r-[0.5px] border-y-[0.5px] border-r-coral/20 border-y-coral/20 border-l-4 border-l-coral bg-white/90 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-charcoal/60">Pending review</p>
                <p className="mt-1 text-2xl font-semibold text-charcoal">{pendingCount}</p>
              </div>
              <div className="rounded-xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-forest bg-white/90 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-charcoal/60">Total downloads</p>
                <p className="mt-1 text-2xl font-semibold text-charcoal">{totalDownloads}</p>
              </div>
            </div>
            {getStatusCard()}
          </div>

          <div className="lg:col-span-2">
            <div className="relative overflow-hidden rounded-xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-forest bg-white/90 p-6 shadow-sm">
              <div className="absolute right-0 top-0 h-6 w-6 bg-sunflower/35 [clip-path:polygon(100%_0,0_0,100%_100%)]" />
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-charcoal">My uploads</h2>
                <Link
                  href="/upload"
                  className="text-sm text-forest hover:text-coral"
                >
                  Upload new
                </Link>
              </div>

              {myResources.length > 0 ? (
                <div className="space-y-3">
                  {myResources.map((resource) => (
                    <div key={resource.id} className="flex items-center justify-between rounded-lg border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-forest bg-warm-bg p-3 shadow-sm">
                      <div>
                        <p className="text-sm font-medium text-charcoal">{resource.title}</p>
                        <p className="text-xs text-charcoal/60">{resource.unit_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-forest/15 bg-white/80 px-2 py-1 text-xs text-charcoal">
                          {resource.resource_type}
                        </span>
                        {getStatusBadge(resource.status)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-charcoal/60">You haven&apos;t uploaded any resources yet.</p>
                  <Link
                    href="/upload"
                    className="mt-3 inline-flex rounded-md bg-coral px-4 py-2 font-medium text-white transition hover:bg-forest"
                  >
                    Upload your first resource
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border-r-[0.5px] border-y-[0.5px] border-r-coral/20 border-y-coral/20 border-l-4 border-l-coral bg-white/90 p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-charcoal/60">
            Quick access
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featuredUniversities.map((university) => (
              <Link
                key={university.id}
                href={`/browse?university=${university.id}`}
                className="rounded-lg border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-forest bg-warm-bg px-4 py-3 text-sm font-medium text-charcoal shadow-sm transition hover:border-coral hover:text-coral"
              >
                {university.name}
              </Link>
            ))}
          </div>
          <p className="mt-3 text-sm text-charcoal/60">
            Don&apos;t see your university? Use the full list on the{' '}
            <Link href="/browse" className="text-forest hover:text-coral">
              Browse page
            </Link>
            .
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/browse"
            className="inline-flex rounded-md bg-forest px-4 py-2 font-medium text-white transition hover:bg-leaf"
          >
            Browse resources
          </Link>
          <Link
            href="/upload"
            className="inline-flex rounded-md border border-forest/25 px-4 py-2 font-medium text-forest transition hover:bg-sunflower/20"
          >
            Upload resource
          </Link>
        </div>
      </div>
    </main>
  );
}
