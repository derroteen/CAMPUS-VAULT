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
import ProTrialBanner from "@/app/components/ProTrialBanner";
import { Skeleton } from "@/components/Skeleton";
import { isSubscriptionCurrentlyActive } from "@/lib/subscription-status";
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
          .select("tier, status, expires_at")
          .eq("user_id", uid)
          .eq("status", "active")
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (
        subResult.data?.tier === "pro" &&
        isSubscriptionCurrentlyActive(subResult.data)
      ) {
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
          classes: "bg-leaf/15 text-forest border-leaf/30",
          icon: <CheckCircle className="h-3 w-3" />,
        };
      case "sold":
        return {
          label: "Sold",
          classes: "bg-forest/10 text-forest border-forest/20",
          icon: <ShoppingBag className="h-3 w-3" />,
        };
      case "expired":
        return {
          label: "Expired",
          classes: "bg-coral/15 text-coral border-coral/30",
          icon: <XCircle className="h-3 w-3" />,
        };
      default:
        return {
          label: status,
          classes: "bg-sunflower/15 text-charcoal border-sunflower/30",
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
      <main className="min-h-screen bg-warm-bg px-4 py-10 text-charcoal sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="rounded-2xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-coral bg-white/90 p-4 shadow-sm">
            <Skeleton className="h-4 w-56 rounded-lg" />
            <Skeleton className="mt-3 h-2 w-36 rounded-full" />
          </div>

          {Array.from({ length: 3 }).map((_, index) => (
            <article
              key={index}
              className="rounded-2xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-forest bg-white/90 p-4 shadow-sm sm:p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row">
                <Skeleton className="aspect-square w-full rounded-xl sm:w-36" />
                <div className="flex flex-1 flex-col gap-3">
                  <Skeleton className="h-4 w-24 rounded-full" />
                  <Skeleton className="h-5 w-3/4 rounded-lg" />
                  <Skeleton className="h-5 w-1/3 rounded-lg" />
                  <Skeleton className="h-3 w-2/3 rounded-lg" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>
    );
  }

  const soldCount = listings.filter((l) => l.status === "sold").length;
  const isOverFreeLimit = !isPro && activeCount > 3;

  return (
    <main className="min-h-screen bg-warm-bg px-4 py-10 text-charcoal sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">My Products</h1>
            <p className="mt-1 text-charcoal/60">
              Manage everything you&apos;re selling on the marketplace.
            </p>
          </div>
          <Link
            href="/marketplace/new"
            className="inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-sm font-medium text-white transition hover:bg-leaf"
          >
            <ShoppingBag className="h-4 w-4" />
            New product
          </Link>
        </div>

        <div className="mb-6">
          <ProTrialBanner />
        </div>

        {isOverFreeLimit ? (
          <div className="mb-6 rounded-2xl border-r-[0.5px] border-y-[0.5px] border-r-coral/25 border-y-coral/25 border-l-4 border-l-sunflower bg-white/90 p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="text-sm text-charcoal/80">
                You have <span className="font-semibold text-charcoal">{activeCount}</span> active products, but the Free plan allows only 3. You won&apos;t be able to add new products until you&apos;re back at 3 or fewer - delete some listings, or upgrade to Pro again to continue enjoying unlimited listings and boosted visibility.
              </p>
              <Link
                href="/marketplace/pro"
                className="inline-flex items-center rounded-xl border border-coral/30 bg-sunflower/15 px-3 py-1.5 text-sm font-medium text-coral transition hover:bg-sunflower/25"
              >
                Upgrade to Pro
              </Link>
            </div>
          </div>
        ) : null}

        {/* Quota summary */}
        <div className="mb-6 rounded-2xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-coral bg-white/90 p-4 shadow-sm">
          {isPro ? (
            <p className="flex items-center gap-2 text-sm text-forest">
              <Sparkles className="h-4 w-4 text-sunflower" />
              Unlimited products (Pro)
            </p>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-charcoal/70">
                <span className="font-semibold text-charcoal">{activeCount}</span>{" "}
                of <span className="font-semibold text-charcoal">3</span> free
                products used
              </p>
              <div className="flex items-center gap-3">
                <div className="h-2 w-32 overflow-hidden rounded-full bg-warm-bg">
                  <div
                    className="h-full rounded-full bg-leaf transition-all"
                    style={{ width: `${Math.min(100, (activeCount / 3) * 100)}%` }}
                  />
                </div>
                <Link
                  href="/marketplace/pro"
                  className="text-sm font-medium text-forest transition hover:text-coral"
                >
                  Upgrade
                </Link>
              </div>
            </div>
          )}
        </div>

        {soldCount > 0 ? (
          <div className="mb-6 rounded-2xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-sunflower bg-white/90 p-4 shadow-sm">
            <p className="text-sm text-charcoal/80">
              You have {soldCount} sold product(s). Consider deleting them to keep your dashboard tidy.
            </p>
          </div>
        ) : null}

        {/* Listings */}
        {listings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-forest/15 bg-white/90 p-8 text-center text-charcoal/60 shadow-sm">
            You haven&apos;t posted any products yet.{" "}
            <Link
              href="/marketplace/new"
              className="text-forest transition hover:text-coral"
            >
              Create your first product →
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
                  className="rounded-2xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-forest bg-white/90 p-4 shadow-sm transition hover:border-coral/30 sm:p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row">
                    {/* Thumbnail */}
                    <Link
                      href={`/marketplace/${listing.id}`}
                      className="relative aspect-[4/3] w-full flex-shrink-0 overflow-hidden rounded-xl border border-forest/15 bg-warm-bg sm:w-36"
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
                        <div className="flex h-full items-center justify-center text-charcoal/30">
                          <ShoppingBag className="h-8 w-8" />
                        </div>
                      )}
                    </Link>

                    {/* Info + actions */}
                    <div className="flex flex-1 flex-col justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] ${badge.classes}`}
                          >
                            {badge.icon}
                            {badge.label}
                          </span>
                          {isPro && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-sunflower/30 bg-sunflower/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-charcoal">
                              <Sparkles className="h-3 w-3" />
                              Boosted
                            </span>
                          )}
                        </div>

                        <Link
                          href={`/marketplace/${listing.id}`}
                          className="mt-2 block text-lg font-semibold text-charcoal hover:text-forest"
                        >
                          {listing.title}
                        </Link>

                        <p className="mt-1 text-lg font-bold text-forest">
                          {formatPrice(listing.price)}
                        </p>

                        <p className="mt-1 text-xs text-charcoal/50">
                          Posted {formatDate(listing.created_at)} · Expires{" "}
                          {formatDate(listing.expires_at)}
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/marketplace/${listing.id}/edit`}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-forest/15 px-3 py-1.5 text-sm text-forest transition hover:bg-sunflower/15 hover:text-coral"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Link>

                        {listing.status === "active" && (
                          <button
                            type="button"
                            onClick={() => handleMarkSold(listing.id)}
                            disabled={actionInProgress === listing.id}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-leaf/25 bg-leaf/10 px-3 py-1.5 text-sm text-forest transition hover:bg-sunflower/15 disabled:opacity-70"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            {actionInProgress === listing.id
                              ? "Updating..."
                              : "Mark as sold"}
                          </button>
                        )}

                        {deleteConfirmId === listing.id ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleDelete(listing.id)}
                              disabled={isDeleting}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-coral px-3 py-1.5 text-sm font-medium text-white transition hover:bg-forest disabled:opacity-70"
                            >
                              {isDeleting ? "Deleting..." : "Confirm"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="rounded-xl border border-forest/15 px-3 py-1.5 text-sm text-forest transition hover:bg-sunflower/15"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(listing.id)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-coral/25 bg-coral/10 px-3 py-1.5 text-sm text-coral transition hover:bg-forest/10"
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
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-forest/15 pt-4">
          <Link
            href="/marketplace"
            className="text-sm text-charcoal/60 transition hover:text-forest"
          >
            ← Browse marketplace
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-charcoal/60 transition hover:text-forest"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
