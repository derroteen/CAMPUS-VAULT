"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CheckCircle,
  Clock,
  Pencil,
  ShoppingBag,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type ListingRow = {
  id: string;
  title: string;
  price: number;
  status: string;
  is_boosted: boolean;
  created_at: string;
  expires_at: string;
};

type MyListing = ListingRow & {
  thumbnail_url: string | null;
};

type ImageRow = {
  listing_id: string;
  image_url: string;
  sort_order: number;
};

export default function MyListingsPage() {
  const router = useRouter();

  const [listings, setListings] = useState<MyListing[]>([]);
  const [isPro, setIsPro] = useState(false);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);


  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      const uid = session.user.id;

      // Parallel fetches: listings, subscription tier
      const [listingsResult, subResult] = await Promise.all([
        supabase
          .from("listings")
          .select("id, title, price, status, is_boosted, created_at, expires_at")
          .eq("seller_id", uid)
          .order("created_at", { ascending: false }),
        supabase
          .from("subscriptions")
          .select("tier")
          .eq("user_id", uid)
          .eq("status", "active")
          .limit(1)
          .maybeSingle(),
      ]);

      if (subResult.data?.tier === "pro") {
        setIsPro(true);
      }

      const rows: ListingRow[] = listingsResult.data ?? [];

      // Batch-fetch first thumbnail per listing
      if (rows.length > 0) {
        const ids = rows.map((r) => r.id);
        const { data: imgData } = await supabase
          .from("listing_images")
          .select("listing_id, image_url, sort_order")
          .in("listing_id", ids)
          .order("sort_order", { ascending: true });

        const thumbMap = new Map<string, string>();
        if (imgData) {
          for (const img of imgData as ImageRow[]) {
            if (!thumbMap.has(img.listing_id)) {
              thumbMap.set(img.listing_id, img.image_url);
            }
          }
        }

        setListings(
          rows.map((r) => ({
            ...r,
            thumbnail_url: thumbMap.get(r.id) ?? null,
          }))
        );
      } else {
        setListings([]);
      }

      setActiveCount(rows.filter((r) => r.status === "active").length);
      setLoading(false);
    };

    init();
  }, [router]);

  // ── Helpers ──────────────────────────────────────────────────────────

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const formatPrice = (price: number) =>
    `KES ${price.toLocaleString("en-KE")}`;

  const statusBadge = (status: string) => {
    switch (status) {
      case "active":
        return {
          label: "Active",
          classes: "bg-emerald-500/15 text-emerald-200",
          icon: <CheckCircle className="h-3 w-3" />,
        };
      case "sold":
        return {
          label: "Sold",
          classes: "bg-sky-500/15 text-sky-200",
          icon: <ShoppingBag className="h-3 w-3" />,
        };
      case "expired":
        return {
          label: "Expired",
          classes: "bg-slate-500/15 text-slate-300",
          icon: <XCircle className="h-3 w-3" />,
        };
      default:
        return {
          label: status,
          classes: "bg-slate-500/15 text-slate-300",
          icon: <Clock className="h-3 w-3" />,
        };
    }
  };

  // ── Actions ──────────────────────────────────────────────────────────

  const handleMarkSold = async (listingId: string) => {
    setActionInProgress(listingId);

    const { error } = await supabase
      .from("listings")
      .update({ status: "sold" })
      .eq("id", listingId);

    if (!error) {
      setListings((prev) =>
        prev.map((l) =>
          l.id === listingId ? { ...l, status: "sold" } : l
        )
      );
      setActiveCount((c) => Math.max(0, c - 1));
    }

    setActionInProgress(null);
  };

  const handleDelete = async (listingId: string) => {
    setActionInProgress(listingId);

    // 1. Fetch all images for this listing so we can remove storage files
    const { data: imgRows } = await supabase
      .from("listing_images")
      .select("image_url")
      .eq("listing_id", listingId);

    // 2. Derive storage paths from public URLs
    if (imgRows && imgRows.length > 0) {
      const bucketBase = supabase.storage
        .from("listing-images")
        .getPublicUrl("").data.publicUrl;

      const storagePaths = imgRows
        .map((row) => {
          if (row.image_url.startsWith(bucketBase)) {
            return decodeURIComponent(row.image_url.slice(bucketBase.length));
          }
          return null;
        })
        .filter(Boolean) as string[];

      if (storagePaths.length > 0) {
        await supabase.storage.from("listing-images").remove(storagePaths);
      }
    }

    // 3. Delete listing row (listing_images cascade-delete via FK)
    const wasActive =
      listings.find((l) => l.id === listingId)?.status === "active";

    const { error } = await supabase
      .from("listings")
      .delete()
      .eq("id", listingId);

    if (!error) {
      setListings((prev) => prev.filter((l) => l.id !== listingId));
      if (wasActive) setActiveCount((c) => Math.max(0, c - 1));
    }

    setDeleteConfirmId(null);
    setActionInProgress(null);
  };

  // ── Render ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <p className="text-slate-300">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">My Listings</h1>
            <p className="mt-1 text-slate-400">
              Manage everything you&apos;re selling on the marketplace.
            </p>
          </div>
          <Link
            href="/marketplace/new"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500"
          >
            <ShoppingBag className="h-4 w-4" />
            New listing
          </Link>
        </div>

        {/* Quota summary */}
        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          {isPro ? (
            <p className="flex items-center gap-2 text-sm text-emerald-200">
              <Sparkles className="h-4 w-4 text-amber-400" />
              Unlimited listings (Pro)
            </p>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-300">
                <span className="font-semibold text-white">{activeCount}</span>{" "}
                of <span className="font-semibold text-white">3</span> free
                listings used
              </p>
              <div className="flex items-center gap-3">
                <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-700">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${Math.min(100, (activeCount / 3) * 100)}%` }}
                  />
                </div>
                <Link
                  href="/marketplace/pro"
                  className="text-sm font-medium text-emerald-400 transition hover:text-emerald-300"
                >
                  Upgrade
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Listings */}
        {listings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 p-8 text-center text-slate-400">
            You haven&apos;t posted any listings yet.{" "}
            <Link
              href="/marketplace/new"
              className="text-emerald-400 transition hover:text-emerald-300"
            >
              Create your first listing →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {listings.map((listing) => {
              const badge = statusBadge(listing.status);
              const isDeleting =
                deleteConfirmId === listing.id &&
                actionInProgress === listing.id;

              return (
                <article
                  key={listing.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-sm transition hover:border-slate-700 sm:p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row">
                    {/* Thumbnail */}
                    <Link
                      href={`/marketplace/${listing.id}`}
                      className="relative aspect-[4/3] w-full flex-shrink-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-800 sm:w-36"
                    >
                      {listing.thumbnail_url ? (
                        <Image
                          src={listing.thumbnail_url}
                          alt={listing.title}
                          fill
                          sizes="144px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-600">
                          <ShoppingBag className="h-8 w-8" />
                        </div>
                      )}
                    </Link>

                    {/* Info + actions */}
                    <div className="flex flex-1 flex-col justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] ${badge.classes}`}
                          >
                            {badge.icon}
                            {badge.label}
                          </span>
                          {listing.is_boosted && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-200">
                              <Sparkles className="h-3 w-3" />
                              Boosted
                            </span>
                          )}
                        </div>

                        <Link
                          href={`/marketplace/${listing.id}`}
                          className="mt-2 block text-lg font-semibold text-white hover:text-emerald-100"
                        >
                          {listing.title}
                        </Link>

                        <p className="mt-1 text-lg font-bold text-emerald-400">
                          {formatPrice(listing.price)}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Posted {formatDate(listing.created_at)} · Expires{" "}
                          {formatDate(listing.expires_at)}
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/marketplace/${listing.id}/edit`}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Link>

                        {listing.status === "active" && (
                          <button
                            type="button"
                            onClick={() => handleMarkSold(listing.id)}
                            disabled={actionInProgress === listing.id}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-sm text-sky-200 transition hover:bg-sky-500/20 disabled:opacity-70"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            {actionInProgress === listing.id
                              ? "Updating..."
                              : "Mark as sold"}
                          </button>
                        )}

                        {deleteConfirmId === listing.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleDelete(listing.id)}
                              disabled={isDeleting}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-rose-500 disabled:opacity-70"
                            >
                              {isDeleting ? "Deleting..." : "Confirm"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="rounded-xl border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-slate-800"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(listing.id)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-sm text-rose-200 transition hover:bg-rose-500/20"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Footer nav */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
          <Link
            href="/marketplace"
            className="text-sm text-slate-400 transition hover:text-white"
          >
            ← Browse marketplace
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-slate-400 transition hover:text-white"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
